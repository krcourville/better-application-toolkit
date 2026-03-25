# @batkit/logger

Logger facade with default console implementation for Node.js and browser environments.

## Installation

```bash
npm install @batkit/logger
```

## Overview

A lightweight logger facade that provides a consistent logging interface for both Node.js and browser environments. Includes a production-ready console logger implementation with structured logging support.

### Developing in this monorepo

This package builds **two** outputs (`index` / `console` and the Node-only `@batkit/logger/async-local`). From the repo root, `pnpm dev` runs both watch processes for `@batkit/logger` via **Turborepo’s [`with`](https://turbo.build/repo/docs/reference/configuration#with)** (`dev` + `dev:async-local`). If you run `pnpm dev` only inside `packages/logger`, start `pnpm dev:async-local` in a second terminal as well.

## Features

- ✅ Simple, intuitive API
- ✅ Works in Node.js and browsers (the main entry is isomorphic; **`@batkit/logger/async-local`** is Node-only)
- ✅ Structured logging support
- ✅ **Async-local log context** (Node): `@batkit/logger/async-local`
- ✅ Log level filtering
- ✅ Pretty and JSON output modes
- ✅ Zero runtime dependencies on the core facade
- ✅ TypeScript-first
- ✅ ESM and CommonJS support

## Usage

### Basic Logging

```typescript
import { LoggerFacade } from '@batkit/logger';

const logger = LoggerFacade.getLogger('my-app');

logger.debug('Debug message');
logger.info('Application started');
logger.warn('Low disk space');
logger.error(new Error('Failed to connect to database'));
```

### Structured Logging

```typescript
import { LoggerFacade } from '@batkit/logger';

const logger = LoggerFacade.getLogger('my-app');

// Add structured data to logs
logger.info('User logged in', {
  userId: '123',
  timestamp: Date.now(),
  ipAddress: '192.168.1.1'
});

// Error logging (error first, then message, then context)
try {
  // ... some code
} catch (error) {
  if (error instanceof Error) {
    logger.error(error, 'Operation failed', { operation: 'createUser' });
  }
}
```

### Async-local log context (Node only)

**Background:** [Understanding AsyncLocalStorage](../../docs/async-local-storage.md)

For request- or job-scoped fields (`requestId`, `transactionId`, etc.), use the **`@batkit/logger/async-local`** entry (built on `AsyncLocalStorage`). Wrap your `LoggerProvider` with `ContextualLoggerProvider`, run the scope with `runWithLogContext`, and optionally merge more fields later with `mergeLogContext`.

```typescript
import { LoggerFacade } from '@batkit/logger';
import {
  ContextualLoggerProvider,
  mergeLogContext,
  runWithLogContext,
  getLogContext,
} from '@batkit/logger/async-local';
import { PinoLoggerProvider } from '@batkit/logger-pino';
import { randomUUID } from 'node:crypto';

LoggerFacade.setProvider(
  new ContextualLoggerProvider(new PinoLoggerProvider({ level: 'info' })),
);

runWithLogContext({ requestId: randomUUID() }, () => {
  mergeLogContext({ transactionId: 'txn-123' });
  const log = LoggerFacade.getLogger('payments');
  log.info('Captured'); // structured context includes both ids
  console.log(getLogContext());
});
```

In Express, mount [`logContextMiddleware`](../express-middleware/README.md) early instead of calling `runWithLogContext` yourself at the top of every route.

### JSON / structured output

For JSON log lines in production, use [@batkit/logger-pino](../logger-pino) (or another `LoggerProvider`) and attach it with `LoggerFacade.setProvider`.

## API Reference

See exported types in `src/types.ts`. Highlights:

- **`Logger`** — `debug` / `info` / `warn` / `error` use the `LogMethod` overloads (context-only, message + context, error + context, error + message + context).
- **`LoggerProvider`** — `getLogger(name)`, `isLogLevelEnabled`.
- **`LoggerFacade`** — `getLogger`, `setProvider`, `getProvider`, `configure`.
- **Node-only:** `@batkit/logger/async-local` — `runWithLogContext`, `getLogContext`, `mergeLogContext`, `ContextualLoggerProvider`.

## Using with Other Implementations

This package provides the logger facade. You can use alternative implementations:

- [@batkit/logger-pino](../logger-pino) - Pino.js based implementation (recommended for production)

```typescript
import type { Logger } from '@batkit/logger';
import { PinoLoggerProvider } from '@batkit/logger-pino';

// Example: use LoggerFacade.setProvider(new PinoLoggerProvider({ level: 'info' }))
// or wrap with ContextualLoggerProvider when using async-local context.
const provider = new PinoLoggerProvider({ level: 'info' });
const logger: Logger = provider.getLogger('app');

logger.info('Using Pino implementation');
```

## Integration with Express

Use [`logContextMiddleware`](../express-middleware/README.md) together with `ContextualLoggerProvider` so each request runs inside `runWithLogContext` and structured logs include correlation fields. See `apps/express-api` for a full example (`POST /api/demo/fulfillment`).

## Best Practices

1. **Use appropriate log levels**:
   - `debug`: Detailed diagnostic information
   - `info`: General informational messages
   - `warn`: Warning messages for potentially harmful situations
   - `error`: Error messages for failures

2. **Add structured context** instead of string interpolation:
   ```typescript
   // ✅ Good
   logger.info('User created', { userId, email });

   // ❌ Avoid
   logger.info(`User ${userId} created with email ${email}`);
   ```

3. **Use `@batkit/logger/async-local`** on Node when many layers need the same correlation ids without threading them through every function

4. **Include errors first** (per `LogMethod` overloads), then optional message, then context:
   ```typescript
   logger.error(error, 'Failed to save user', { userId });
   ```

## TypeScript

Full TypeScript support with exported types:

```typescript
import type { Logger, LoggerProvider } from '@batkit/logger';

function setupLogger(provider: LoggerProvider, name: string): Logger {
  return provider.getLogger(name);
}
```

## Tree-Shaking

For optimal tree-shaking, import from the specific entry point:

```typescript
// Import only the console entry (re-exports console helpers)
import { ConsoleLoggerProvider } from '@batkit/logger/console';
```

**Node-only:** `@batkit/logger/async-local`

## License

MIT © Ken Courville
