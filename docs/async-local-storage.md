# Understanding `AsyncLocalStorage` (Node.js)

This note explains **AsyncLocalStorage** (ALS) in plain language: what problem it solves, how to think about it, and where it shows up in Better Application Toolkit (BAT). It is not a replacement for the Node.js docs—see the [official `AsyncLocalStorage` documentation](https://nodejs.org/api/async_context.html#class-asynclocalstorage) for full detail.

## What it is

In Node.js, many requests and background jobs run **at the same time** on a single thread. Ordinary global variables are therefore unsafe for “the current request’s id” or “the current user id”—another request could overwrite that global before your async code resumes.

**AsyncLocalStorage** gives you a **hidden argument**: a small value (often an object) that is **associated with the current asynchronous chain**—the sequence of calls and `await`s that grew out of one starting callback. Any code running later in that chain can retrieve that value without every function listing it as a parameter.

So ALS is **not** magic global state for the whole process. It is **scoped to one logical async flow** (and to child async work started from that flow).

## Mental model

1. You create an `AsyncLocalStorage` instance once (BAT does this inside `@batkit/logger/async-local`).
2. You **enter** a scope with `.run(store, callback)` (or related APIs). While `callback` runs—and while any `Promise`s or timers **scheduled from inside** that scope run—`getStore()` returns that `store`.
3. Another concurrent `.run(differentStore, otherCallback)` has its **own** store; they do not mix.

Think of it as **thread-local storage**, but for **async “threads”** in Node rather than OS threads.

## Typical use cases

- **HTTP request correlation**: `requestId`, `traceId`, or `transactionId` on every log line without threading them through twenty helper signatures.
- **Per-request resources**: a database session, transaction handle, or tenant id that many layers need read-only access to.
- **Tracing / observability**: attaching a minimal context bag for OpenTelemetry-style propagation (often combined with other libraries).

## Minimal examples (raw Node.js)

**After an `await`, context is still there:**

```typescript
import { AsyncLocalStorage } from "node:async_hooks";

const als = new AsyncLocalStorage<{ id: string }>();

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

als.run({ id: "abc" }, async () => {
  await delay(10);
  console.log(als.getStore()); // { id: 'abc' }
});
```

**Two concurrent requests stay isolated:**

```typescript
import { AsyncLocalStorage } from "node:async_hooks";

const als = new AsyncLocalStorage<{ requestId: string }>();

async function handle(requestId: string) {
  return als.run({ requestId }, async () => {
    await new Promise((r) => setImmediate(r));
    return als.getStore()?.requestId;
  });
}

const [a, b] = await Promise.all([handle("req-1"), handle("req-2")]);
// a === 'req-1', b === 'req-2'
```

## Limitations and pitfalls

- **Node-only today**: ALS lives in `node:async_hooks`. It is not available in the browser as a standard feature; BAT’s `@batkit/logger/async-local` entry is for **Node** only.
- **Work must stay in the same async chain**: if you schedule work **from outside** the `run` callback (e.g. a stray global queue that does not originate from code that ran under `run`), that work may **not** see your store.
- **Express and similar frameworks**: Prefer middleware that calls `run(store, () => next())` with a **synchronous** `next()` inside the callback. An `async` middleware that `await`s before calling `next()` can accidentally leave the rest of the pipeline **outside** your store unless you structure it carefully.
- **Not security**: Putting a user id in ALS does **not** authenticate or authorize anyone; it only helps passing data through the call stack.

## How BAT uses ALS

- **`@batkit/logger/async-local`** exports `runWithContext`, `getLogContext`, `mergeLogContext`, and `ContextualLoggerProvider`. Together, they attach a **mutable** bag of log fields to the current async scope and merge those fields into every log call when you wrap your `LoggerProvider`.
- **`@batkit/express-middleware`** exports `logContextMiddleware`, which calls `runWithContext` for each HTTP request (Express-specific, but the ALS primitives have **no** Express import).
- **`apps/express-api`**: wires a `ContextualLoggerProvider` around **Pino**, adds `logContextMiddleware` (sets `requestId`), and exposes **`POST /api/demo/fulfillment`** where `mergeLogContext({ transactionId })` runs after headers/body are known; deeper modules log **without** receiving those ids as parameters.

For API details, see [`packages/logger/README.md`](../packages/logger/README.md) and [`packages/express-middleware/README.md`](../packages/express-middleware/README.md).
