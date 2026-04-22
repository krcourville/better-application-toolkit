# Observability recommendations

This document collects practical guidance for building observable Node.js services. It complements
the BAT packages: use it for *what* to aim for, and the package READMEs for *how* to wire things in
this repo.

Each `###` rule uses **PREFER** (what to lean toward) or **AVOID** (what to steer clear of), with a
stable `bat-*` id in the heading for citations.

## Introduction

A common way to group observability work is **MELT**:

- **M**etrics — How much, how fast, how often (over time). *In BAT:* not a package today;
  use your platform (Prometheus, Datadog, CloudWatch, etc.).
- **E**vents — Discrete occurrences (business or product signals). *In BAT:* often structured
  log lines or a dedicated event pipeline.
- **L**ogs — What happened, with context, for debugging and audit. *In BAT:*
  [@batkit/logger](../packages/logger/README.md) and
  [AsyncLocalStorage](./async-local-storage.md).
- **T**races — How a request flowed across services and where time went. *In BAT:* correlation IDs
  via middleware; full tracing via OpenTelemetry (or similar).

Metrics, logs, and traces should agree on **identity**: the same request or job should be joinable
across signals (shared IDs, consistent timestamps, and compatible cardinality rules).

## Logging

Structured logs are the default expectation for production services: fixed fields (level, message,
time) plus JSON-friendly context you can query.

### PREFER: Log enough — `bat-100`

Emit enough context that someone unfamiliar with the code can narrow an incident without
redeploying. Prefer stable field names (`userId`, `requestId`, `errorCode`) over prose-only
messages.

Include identifiers that correlate with traces and metrics when you have them (request ID, trace ID
if your tracer injects one).

### AVOID: Log too much — `bat-101`

Avoid logging large payloads, full SQL, or secrets (tokens, cookies, PII you do not have a
retention story for). High-volume `debug` in hot paths can dominate cost and hide real errors—gate
verbose logs behind level. When volume is still extreme, use sampling (`bat-111`).

### AVOID: Log in duplicate — `bat-102`

If middleware already logs “request started / finished,” avoid repeating the same line in every
handler. One authoritative log per lifecycle event reduces noise and makes dashboards trustworthy.

### PREFER: Treat logged errors as actionable — `bat-103`

If `error` appears in production logs, there should be a clear owner and an expected outcome: fix,
silence with a justified downgrade, or convert to a metric/alarm if it is expected noise. Orphan
error logs erode trust in alerting.

When you adopt that bar as a rule, you spend far less time deciding which **error** lines are truly
bad versus noise that can wait: what reaches **error** should already mean “someone acts,” so
triage is not the default posture for every log line.

**Catch, log, rethrow** with no new context duplicates **error** lines; the same failure is logged
again at every layer. Prefer (1) not logging at each catch unless you add durable context, (2)
letting the exception propagate, and (3) handling it once at a boundary—e.g.
Express `errorHandler` in this repo, another top-level handler, or an exception manager that maps
errors to responses and one structured log.

```typescript
// AVOID: catch, log, rethrow with no added context—often duplicates up the chain.
try {
  operation();
} catch (e: unknown) {
  // Adds little value; upstream may log the same error again.
  logger.error("it broke", e);
  throw e;
}
```

```typescript
// OK: adds structured context (still easy to repeat inconsistently at every layer).
try {
  operation();
} catch (e: unknown) {
  logger.error("it broke", e, { opId: op.id });
  throw e;
}
```

```typescript
// BETTER: throw a typed/domain error with a clear contract; log once at the boundary.
import { InternalServerError } from "@batkit/errors";

try {
  operation();
} catch (e: unknown) {
  throw new InternalServerError("Operation failed", {
    factors: { opId: op.id },
    cause: e,
  });
}
```

### PREFER: Define log levels — `bat-104`

Agree as a team what `debug`, `info`, `warn`, and `error` mean (for example: `info` = lifecycle and
business outcomes, `warn` = degradations that did not fail the request, `error` = failed operations
or invariant breaks).

BAT’s logger facade follows common level semantics; keep providers consistent across services.

### PREFER: Use named loggers — `bat-105`

Use a logger name per module or concern (`http`, `db`, `payments`) so filters in your log backend
stay usable as the codebase grows. In BAT, obtain loggers via `LoggerFacade.getLogger("name")`.

### PREFER: Allow injection of logging context — `bat-106`

Request-scoped fields (tenant, user, request ID) should flow without passing a logger instance
through every function. On Node, **AsyncLocalStorage** is the usual pattern; see
[Understanding AsyncLocalStorage](./async-local-storage.md) and `ContextualLoggerProvider` in
[@batkit/logger](../packages/logger/README.md).

### PREFER: Invest in automatic context augmentation — `bat-107`

Centralize context in middleware or job wrappers: parse incoming headers, generate IDs when
missing, and merge context once per request or job. That keeps handlers thin and logging consistent.
BAT’s Express stack documents this pattern in
[@batkit/express-middleware](../packages/express-middleware/README.md) (`logContextMiddleware`).

### PREFER: Include a correlation or tracing ID — `bat-108`

Propagate an ID from the edge (load balancer, API gateway, or first service) through logs and
downstream calls. Even before full distributed tracing, a **request ID** makes multi-service
incidents debuggable. Prefer accepting an incoming `X-Request-Id` (or similar) when present and
only generating one when absent.

### PREFER: Use structured logging — `bat-109`

Emit logs as discrete fields (JSON or equivalent key-value shape), not only free-form sentences, so
your backend can filter, aggregate, and alert reliably. Use stable key names for domain context
(`requestId`, `userId`, `outcome`) alongside standard fields (time, level, message). In BAT, pass
structured data on logger calls; in Node production, a JSON-oriented provider such as
[@batkit/logger-pino](../packages/logger-pino/README.md) keeps output machine-friendly end to end.

### AVOID: Letting logging hurt performance — `bat-110`

Keep logging from dominating hot paths: avoid synchronously formatting huge objects, blocking I/O
inside log calls, or building expensive strings when the event would be dropped by level anyway.
Prefer lazy evaluation, **level guards** before heavy work, and sinks that match your latency budget
(for example asynchronous or buffered pipelines where appropriate). When margins are tight, compare
tail latency with logging on versus off under representative load.

For example, stringifying a large value eagerly builds that string even when the log line is
filtered out. Prefer a cheap structured line, or pay for `JSON.stringify` only after a level guard
(for example Pino’s `isLevelEnabled`):

```typescript
import pino from "pino";

const logger = pino({ level: "info" });

function handle(largeObject: unknown) {
  // Anti-pattern: stringifies on every call, even when `debug` is filtered out.
  logger.debug(`payload=${JSON.stringify(largeObject)}`);

  // Level guard: expensive formatting only when `debug` is enabled.
  if (logger.isLevelEnabled("debug")) {
    logger.debug(JSON.stringify(largeObject));
  }

  // Often enough: small structured fields instead of the full payload.
  logger.debug({ summary: "accepted" }, "done");
}
```

### PREFER: Consider log sampling — `bat-111`

Very chatty **info** or **debug** streams can still overwhelm cost and signal even after level
gating. Sampling emits only a fraction of eligible lines; hash or bucket on a stable key (request
ID, trace ID) so one context is all-in or all-out together. Keep **error** (and usually slow paths)
at full rate unless policy says otherwise. Pair sampling with dashboards so a thinned stream that
lies to you is obvious.

### PREFER: Use pattern analysis — `bat-112`

Noisy logs you have not cleaned up yet are still a signal mine: use your platform’s **pattern** or
**aggregation** views (group by message shape, route, fingerprint, or normalized fields) to spot
**new** spikes or rare lines instead of reading pages by hand. Compare time windows (today vs
yesterday, deploy vs deploy) so a fresh template or error string stands out above the baseline hum.
Treat pattern analysis as a bridge until `bat-101` and `bat-111` shrink the stream.

## Tracing

**Distributed tracing** records spans (units of work) and links them into trees so you can see
latency breakdown and cross-service paths. BAT does not ship a tracer SDK; you typically add
**OpenTelemetry** (or your vendor’s agent) alongside BAT logging.

### PREFER: Align trace and log identifiers — `bat-200`

Ensure trace and span IDs (or your vendor’s equivalents) can be attached to log context when the
tracer and logger run in the same process, so signals stay joinable.

### PREFER: Propagate tracing context on outbound calls — `bat-201`

Use instrumentation libraries or manual propagation on outbound HTTP/gRPC so downstream services
continue the trace instead of starting unrelated work.

### PREFER: Name spans after operations, not generic labels — `bat-202`

Prefer concrete span names such as `db.users.findById` over vague labels like `query`, so traces
stay readable in backends and during incident review.

### PREFER: Sample traces deliberately — `bat-203`

100% tracing is expensive; many teams sample baseline traffic lightly and retain more detail for
errors or slow requests. Tune sampling with cost and SLO debuggability in mind.

### PREFER: Lean on request IDs until distributed tracing is in place — `bat-204`

Strong **request IDs** in logs (see `bat-108` under Logging and
[@batkit/express-middleware](../packages/express-middleware/README.md)) already cover much of the
“two services disagree on what happened” case before full distributed tracing lands.

## Metrics

**Metrics** compress behavior into time series: rates, latency percentiles, saturation, and
business KPIs. They are ideal for SLOs, autoscaling, and paging—usually more stable than log-based
counts. BAT does not emit metrics directly; export them from your runtime (OTel metrics, StatsD, or
cloud-native agents).

### PREFER: Use RED signals for request-serving workloads — `bat-300`

Track *Rate*, *Errors*, and *Duration* per route or dependency so you can see user-visible
health and regressions quickly.

### PREFER: Use USE signals for resources — `bat-301`

For CPUs, disks, queues, and similar resources, watch *Utilization*, *Saturation*, and *Errors* so
capacity limits show up before they become outages.

### PREFER: Export metrics from the runtime and bound label cardinality — `bat-302`

Emit metrics from the same process that serves traffic when possible. High-cardinality labels
(raw user IDs, unbounded paths) can explode cost and break backends—prefer bounded labels and use
logs or traces for drill-down detail.

## Errors and API responses

### PREFER: Return consistent machine-readable HTTP errors — `bat-400`

Operational clarity improves when HTTP errors are **consistent and machine-readable**. BAT’s
[@batkit/errors](../packages/errors/README.md) and [@batkit/rfc9457](../packages/rfc9457/README.md)
support **RFC 9457 Problem Details**;
[@batkit/express-middleware](../packages/express-middleware/README.md) maps thrown errors to
responses. Pair that with structured logs: log the same `type` / `instance` / correlation fields you
expose to clients (without leaking internal details).

## Further reading

- [Understanding AsyncLocalStorage](./async-local-storage.md)
- [@batkit/logger](../packages/logger/README.md)
- [@batkit/express-middleware](../packages/express-middleware/README.md)
- [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html) — Problem Details for HTTP APIs
