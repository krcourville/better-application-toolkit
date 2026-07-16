# @batkit/logger-pino

Pino.js implementation of the @batkit/logger facade for high-performance logging in Node.js and browser.

## Installation

```bash
npm install @batkit/logger-pino pino
```

For development with pretty printing:

```bash
npm install --save-dev pino-pretty
```

## Overview

A high-performance `LoggerProvider` implementation using [Pino](https://getpino.io/), one of the fastest Node.js loggers available. Implements the `@batkit/logger` `LoggerProvider` interface for seamless integration with the Better Application Toolkit.

## Features

- ✅ Extremely fast (built on Pino)
- ✅ Works in Node.js and browsers (Pino has browser support)
- ✅ Structured JSON logging
- ✅ Low overhead
- ✅ Named child loggers via `getLogger(name)`
- ✅ Full Pino config (redaction, transports, pretty printing) passed straight through
- ✅ TypeScript-first

## Usage

### Basic Usage

```typescript
import { LoggerFacade } from "@batkit/logger";
import { PinoLoggerProvider } from "@batkit/logger-pino";

LoggerFacade.setProvider(new PinoLoggerProvider({ level: "info" }));

const logger = LoggerFacade.getLogger("my-app");

logger.info("Application started");
logger.warn("Low disk space", { available: "10GB" });
logger.error(new Error("Connection timeout"), "Database connection failed");
```

### Development Mode (Pretty Output)

`PinoLoggerProvider`'s constructor takes Pino's own [`LoggerOptions`](https://getpino.io/#/docs/api?id=options) directly — configure `transport` for `pino-pretty` the same way you would with plain Pino:

```typescript
import { PinoLoggerProvider } from "@batkit/logger-pino";

const provider = new PinoLoggerProvider({
  level: "debug",
  transport: {
    target: "pino-pretty",
    options: { colorize: true, ignore: "pid,hostname" },
  },
});
```

### Redacting Sensitive Data

```typescript
import { PinoLoggerProvider } from "@batkit/logger-pino";

const provider = new PinoLoggerProvider({
  level: "info",
  redact: {
    paths: ["password", "req.headers.authorization"],
    censor: "[REDACTED]",
  },
});

provider.getLogger("api").info("User data", {
  username: "john",
  password: "secret", // shows as '[REDACTED]'
});
```

### Named (Child) Loggers

```typescript
import { PinoLoggerProvider } from "@batkit/logger-pino";

const provider = new PinoLoggerProvider({ level: "info" });

const authLogger = provider.getLogger("auth");
const usersLogger = provider.getLogger("users");

authLogger.info("Login attempt"); // pino child logger name: "auth"
usersLogger.info("User created"); // pino child logger name: "users"
```

### Wrapping a Pino Instance Directly

`adaptPinoToBatkitLogger` wraps an existing Pino `Logger`/child logger into the `@batkit/logger` `Logger` interface, if you're managing the Pino instance yourself instead of going through `PinoLoggerProvider`:

```typescript
import { adaptPinoToBatkitLogger } from "@batkit/logger-pino";
import { pino } from "pino";

const pinoRoot = pino({ level: "info" });
const logger = adaptPinoToBatkitLogger(pinoRoot.child({ name: "worker" }));

logger.info("Processing job", { jobId: "42" });
```

## API Reference

### Classes

#### `PinoLoggerProvider`

Implements `@batkit/logger`'s `LoggerProvider` interface on top of Pino.

```typescript
new PinoLoggerProvider(config?: LoggerOptions) // LoggerOptions from "pino"
```

**Methods:**

- `getLogger(name: string): Logger` — returns a `@batkit/logger` `Logger` backed by `pino().child({ name })`
- `isLogLevelEnabled(level: LogLevel): boolean` — checks `"DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL"` against the root Pino logger

### Functions

#### `adaptPinoToBatkitLogger(pinoChild: PinoLogger): Logger`

Wraps a Pino `Logger` (or child logger) instance into the `@batkit/logger` `Logger` interface. `PinoLoggerProvider.getLogger` uses this internally.

## Integration with Express

Use [`logContextMiddleware`](../express-middleware/README.md) with [`ContextualLoggerProvider`](../logger/README.md) from `@batkit/logger/async-local` so correlation fields flow into Pino output:

```typescript
import { LoggerFacade } from "@batkit/logger";
import { ContextualLoggerProvider } from "@batkit/logger/async-local";
import { PinoLoggerProvider } from "@batkit/logger-pino";
import { logContextMiddleware } from "@batkit/express-middleware";
import express from "express";
import { randomUUID } from "node:crypto";

LoggerFacade.setProvider(new ContextualLoggerProvider(new PinoLoggerProvider({ level: "info" })));

const app = express();
app.use(
  logContextMiddleware({
    initialContext: (req) => ({ requestId: req.get("x-request-id") ?? randomUUID() }),
  }),
);

app.get("/users", (req, res) => {
  LoggerFacade.getLogger("api").info("Fetching users list");
  res.json({ users: [] });
});
```

## Performance

Pino is one of the fastest loggers for Node.js:

- Asynchronous logging by default
- Minimal overhead
- Fast JSON serialization
- Optimized for high-throughput applications

## Browser Support

Pino includes browser support out of the box. The same API works in both Node.js and browser environments, though features like transports and file logging are Node.js-specific.

## Best Practices

1. **Pass `transport: { target: "pino-pretty", ... }`** in development for readable output
2. **Leave `transport` unset in production** for structured JSON logs
3. **Redact sensitive data** using Pino's `redact` option
4. **Use `getLogger(name)`** to scope logs per module/component
5. **Avoid string interpolation** — use structured logging instead

## Learn More

- [Pino Documentation](https://getpino.io/)
- [Pino Pretty](https://github.com/pinojs/pino-pretty)
- [@batkit/logger](../logger) - Logger facade documentation

## License

MIT © Ken Courville
