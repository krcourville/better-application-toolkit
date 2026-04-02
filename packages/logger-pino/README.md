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

A high-performance logger implementation using [Pino](https://getpino.io/), one of the fastest Node.js loggers available. Implements the `@batkit/logger` interface for seamless integration with the Better Application Toolkit.

## Features

- ✅ Extremely fast (built on Pino)
- ✅ Works in Node.js and browsers (Pino has browser support)
- ✅ Structured JSON logging
- ✅ Low overhead
- ✅ Child loggers with context
- ✅ Sensitive data redaction
- ✅ Pretty printing for development
- ✅ TypeScript-first

## Usage

### Basic Usage

```typescript
import { createPinoLogger } from "@batkit/logger-pino";
import { LogLevel } from "@batkit/logger";

const logger = createPinoLogger({ level: LogLevel.INFO });

logger.info("Application started");
logger.warn("Low disk space", { available: "10GB" });
logger.error("Database connection failed", new Error("Connection timeout"));
```

### Development Mode (Pretty Output)

```typescript
import { createDevLogger } from "@batkit/logger-pino";

const logger = createDevLogger({ app: "my-api" });

logger.info("Server started on port 3000");
// Output (colorized):
// [14:23:45 EST] INFO: Server started on port 3000
//     app: "my-api"
```

### Production Mode (JSON + Redaction)

```typescript
import { createProdLogger } from "@batkit/logger-pino";

const logger = createProdLogger({ service: "auth-api" });

logger.info("User logged in", {
  userId: "123",
  password: "secret123", // Will be redacted
  email: "user@example.com",
});
// Output: {"level":"info","service":"auth-api","userId":"123","password":"[Redacted]","email":"user@example.com"}
```

### Custom Configuration

```typescript
import { createPinoLogger } from "@batkit/logger-pino";
import { LogLevel } from "@batkit/logger";

const logger = createPinoLogger({
  level: LogLevel.DEBUG,
  context: { app: "my-service", version: "1.0.0" },
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "yyyy-mm-dd HH:MM:ss",
      ignore: "pid,hostname",
    },
  },
  redact: ["password", "apiKey", "token", "ssn"],
});
```

### Using the Factory

```typescript
import { PinoLoggerFactory } from "@batkit/logger-pino";
import { LogLevel } from "@batkit/logger";

const factory = new PinoLoggerFactory({
  level: LogLevel.INFO,
  context: { service: "api" },
});

const authLogger = factory.createLogger({ module: "auth" });
const userLogger = factory.createLogger({ module: "users" });

authLogger.info("Login attempt"); // Includes: service='api', module='auth'
userLogger.info("User created"); // Includes: service='api', module='users'
```

### Child Loggers

```typescript
import { createPinoLogger } from "@batkit/logger-pino";

const logger = createPinoLogger({ context: { app: "api" } });

//Create request-scoped logger
function handleRequest(requestId: string) {
  const reqLogger = logger.child({ requestId });

  reqLogger.info("Processing request");
  reqLogger.info("Request complete");
  // All logs include requestId
}
```

## API Reference

### Functions

#### `createPinoLogger(options?): Logger`

Creates a Pino logger instance.

**Parameters:**

- `options?: PinoLoggerOptions`

**Returns:** `Logger` instance

#### `createDevLogger(context?): Logger`

Creates a Pino logger configured for development (pretty printing, debug level).

**Parameters:**

- `context?: LoggerContext`

**Returns:** `Logger` instance

#### `createProdLogger(context?): Logger`

Creates a Pino logger configured for production (JSON output, info level, redaction).

**Parameters:**

- `context?: LoggerContext`

**Returns:** `Logger` instance

### Types

#### `PinoLoggerOptions`

```typescript
interface PinoLoggerOptions {
  level?: LogLevel | string;
  context?: LoggerContext;
  transport?: PinoOptions["transport"];
  redact?: string[]; // Paths to redact
  pinoOptions?: Omit<PinoOptions, "level" | "transport">;
}
```

### Classes

#### `PinoLoggerAdapter`

Adapter that implements the `Logger` interface using Pino.

#### `PinoLoggerFactory`

Factory for creating Pino logger instances with shared configuration.

```typescript
new PinoLoggerFactory(options?: PinoLoggerOptions)
```

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

## Redacting Sensitive Data

Pino supports automatic redaction of sensitive fields:

```typescript
const logger = createPinoLogger({
  redact: {
    paths: ["password", "creditCard", "ssn", "req.headers.authorization"],
    censor: "[REDACTED]",
  },
});

logger.info("User data", {
  username: "john",
  password: "secret", // Will show as '[REDACTED]'
  email: "john@example.com",
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

1. **Use `createDevLogger()` in development** for readable output
2. **Use `createProdLogger()` in production** for structured JSON logs
3. **Redact sensitive data** using the `redact` option
4. **Use child loggers** to add request/context-specific data
5. **Avoid string interpolation** - use structured logging instead

## Learn More

- [Pino Documentation](https://getpino.io/)
- [Pino Pretty](https://github.com/pinojs/pino-pretty)
- [@batkit/logger](../logger) - Logger facade documentation

## License

MIT © Ken Courville
