# @batkit/express-middleware

Express middleware for error handling with RFC 9457 Problem Details format.

## Installation

```bash
npm install @batkit/express-middleware express
```

## Overview

Production-ready Express middleware for error handling with automatic RFC 9457 Problem Details formatting.

## Features

- ✅ RFC 9457 Problem Details error responses
- ✅ Handles common error types (AppError, Axios, Zod)
- ✅ Customizable error formatters
- ✅ Support for async route handlers
- ✅ TypeScript-first
- ✅ Production and development modes

## Usage

### Basic Setup

```typescript
import { errorHandler } from '@batkit/express-middleware';
import express from 'express';

const app = express();

// Your routes
app.get('/users/:id', (req, res) => {
  // ... your logic
  res.json({ user: {} });
});
});

// Add error handler (must be LAST)
app.use(errorHandler());

app.listen(3000);
```

### Error Handling

```typescript
import { asyncHandler, errorHandler } from '@batkit/express-middleware';
import { NotFoundError, ValidationError } from '@batkit/errors';
import express from 'express';

const app = express();

// Async route handler with error handling
app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await db.users.findById(req.params.id);

  if (!user) {
    // Automatically converted to RFC 9457 format
    throw new NotFoundError('User', req.params.id);
  }

  res.json(user);
}));

// Synchronous route
app.post('/users', (req, res) => {
  if (!req.body.email) {
    throw new ValidationError('Invalid user data', [
      { field: 'email', message: 'Email is required' }
    ]);
  }

  res.json({ created: true });
});

// Error handler converts all errors to RFC 9457
app.use(errorHandler());
```

### Async-local log context

`logContextMiddleware` wraps each request in [`runWithContext`](https://nodejs.org/api/async_context.html#asynchronous-context-tracking) from `@batkit/logger/async-local` so your code can call `mergeLogContext`, use `getLogContext`, and attach a [`ContextualLoggerProvider`](../logger/README.md)—without `req.logger` or Express-specific types inside the logger package.

**Background:** see the toolkit guide [Understanding AsyncLocalStorage](../../docs/async-local-storage.md).

```typescript
import { logContextMiddleware } from '@batkit/express-middleware';
import { LoggerFacade } from '@batkit/logger';
import { ContextualLoggerProvider, mergeLogContext } from '@batkit/logger/async-local';
import { PinoLoggerProvider } from '@batkit/logger-pino';
import express from 'express';
import { randomUUID } from 'node:crypto';

LoggerFacade.setProvider(new ContextualLoggerProvider(new PinoLoggerProvider({ level: 'info' })));

const app = express();
app.use(express.json());

app.use(
  logContextMiddleware({
    initialContext: (req) => ({
      requestId: req.get('x-request-id') ?? randomUUID(),
    }),
  }),
);

app.post('/orders/:id/submit', (req, res) => {
  mergeLogContext({ transactionId: req.get('x-transaction-id') ?? randomUUID() });
  LoggerFacade.getLogger('orders').info('Submitting'); // includes requestId + transactionId in structured output
  res.status(204).end();
});
```

### Custom Error Formatter

```typescript
import { errorHandler, type ErrorFormatter } from '@batkit/express-middleware';
import type { ExtendedProblemDetails } from '@batkit/rfc9457';

class CustomErrorFormatter implements ErrorFormatter {
  canFormat(error: unknown): boolean {
    return error instanceof MyCustomError;
  }

  format(error: MyCustomError): ExtendedProblemDetails {
    return {
      type: 'error:custom',
      title: 'Custom Error',
      status: 400,
      detail: error.message,
      customField: error.customData
    };
  }
}

app.use(errorHandler({
  formatters: [new CustomErrorFormatter()],
  includeStack: true, // Include stack traces
  logErrors: true,
}));
```

## API Reference

### Log context middleware

#### `logContextMiddleware(options?): Middleware`

Runs `next()` inside `runWithContext(initialContext(req), …)` so nested async work can use `getLogContext` / `mergeLogContext` from `@batkit/logger/async-local`.

**Options:**
```typescript
interface LogContextMiddlewareOptions {
  /** Default: `() => ({})` */
  initialContext?: (req: Request) => Record<string, import('@batkit/logger').LogValue>;
}
```

**Returns:** Express middleware function. Mount it **early** (after body parsers if you need `req` fields).

**Note:** Prefer a synchronous call to `next()` inside the ALS scope. Avoid `async` middleware that `await`s before calling `next()` unless the entire downstream pipeline stays in the same async context.

### Error Handler

#### `errorHandler(options?): ErrorMiddleware`

Creates error handling middleware that converts errors to RFC 9457 format.

**Options:**
```typescript
interface ErrorHandlerOptions {
  formatters?: ErrorFormatter[]; // Custom error formatters
  includeStack?: boolean; // Include stack traces (default: only in dev)
  logErrors?: boolean; // Whether to log errors (default: true)
  onError?: (error: unknown, req: Request) => void; // Custom error logger
}
```

**Returns:** Express error middleware function (must have 4 parameters)

#### `asyncHandler(fn): Middleware`

Wraps async route handlers to catch errors.

**Parameters:**
- `fn`: Async route handler function

**Returns:** Express middleware function

### Types

#### `RequestContext`

```typescript
interface RequestContext {
  requestId: string;
  logger: Logger;
  userId?: string;
  metadata: Record<string, unknown>;
}
```

#### `ErrorFormatter`

```typescript
interface ErrorFormatter {
  canFormat(error: unknown): boolean;
  format(error: unknown): ExtendedProblemDetails;
}
```

## Error Response Format

All errors are returned in RFC 9457 format:

```json
{
  "type": "error:not-found",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "User with id '123' was not found",
  "instance": "/users/123",
  "entityName": "User",
  "entityId": "123"
}
```

## Built-in Error Support

The default error formatter handles:

- **@batkit/errors** - All AppError subclasses
- **Axios errors** - Formatted as upstream service errors
- **Zod errors** - Formatted as validation errors
- **Standard Error** - Formatted as internal server errors

## Best Practices

1. **Add `logContextMiddleware` early** in the middleware chain when using async-local logging
2. **Add `errorHandler` last** after all routes
3. **Use `asyncHandler`** for async routes to catch errors
4. **Use `ContextualLoggerProvider`** with `LoggerFacade` (or your DI) so structured logs pick up ALS fields automatically
5. **Throw `@batkit/errors`** for consistent error handling
6. **Don't expose stack traces** in production (default behavior)

## Example: Complete Setup

```typescript
import { errorHandler, asyncHandler, logContextMiddleware } from '@batkit/express-middleware';
import { NotFoundError, ValidationError } from '@batkit/errors';
import { LoggerFacade } from '@batkit/logger';
import { ContextualLoggerProvider } from '@batkit/logger/async-local';
import { PinoLoggerProvider } from '@batkit/logger-pino';
import express from 'express';
import { randomUUID } from 'node:crypto';

LoggerFacade.setProvider(new ContextualLoggerProvider(new PinoLoggerProvider({ level: 'info' })));

const app = express();
const logger = LoggerFacade.getLogger('server');

// Middleware
app.use(express.json());
app.use(
  logContextMiddleware({
    initialContext: (req) => ({ requestId: req.get('x-request-id') ?? randomUUID() }),
  }),
);

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/users/:id', asyncHandler(async (req, res) => {
  LoggerFacade.getLogger('users').info('Fetching user', { userId: req.params.id });

  const user = await db.users.findById(req.params.id);
  if (!user) {
    throw new NotFoundError('User', req.params.id);
  }

  res.json(user);
}));

app.post('/users', asyncHandler(async (req, res) => {
  const validation = validateUser(req.body);
  if (!validation.success) {
    throw new ValidationError('Invalid user data', validation.errors);
  }

  const user = await db.users.create(req.body);
  res.status(201).json(user);
}));

// Error handler (MUST be last)
app.use(errorHandler({
  includeStack: true
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
});
```

## TypeScript

`logContextMiddleware` uses standard Express typings. Use `getLogContext()` from `@batkit/logger/async-local` when you need the current bag of log fields in a handler or service.

## License

MIT © Ken Courville
