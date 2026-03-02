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

### Request Context

```typescript
import { contextMiddleware, getContext, setContextValue } from '@batkit/express-middleware';
import express from 'express';

const app = express();

app.use(contextMiddleware({
  logger,
  getUserId: (req) => req.user?.id // Extract user ID from request
}));

app.get('/users', (req, res) => {
  // Access logger with automatic request ID
  req.logger.info('Fetching users list');

  // Add metadata to context
  setContextValue('operation', 'list-users');

  // Access context anywhere in the request chain
  const context = getContext();
  console.log(context?.requestId);

  res.json({ users: [] });
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

### Context Middleware

#### `contextMiddleware(options): Middleware`

Creates request context with AsyncLocalStorage.

**Options:**
```typescript
interface ContextMiddlewareOptions {
  logger: Logger; // Base logger for creating request-scoped loggers
  generateRequestId?: () => string; // Custom request ID generator
  getUserId?: (req: Request) => string | undefined; // Extract user ID
  requestIdHeader?: string; // Header to read request ID from (default: 'x-request-id')
}
```

**Returns:** Express middleware function

#### `getContext(): RequestContext | undefined`

Get the current request context.

**Returns:** Current `RequestContext` or `undefined` if not in a request

#### `setContextValue(key: string, value: unknown): void`

Add metadata to the current request context.

#### `getContextValue(key: string): unknown`

Get metadata from the current request context.

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

1. **Add `contextMiddleware` early** in the middleware chain
2. **Add `errorHandler` last** after all routes
3. **Use `asyncHandler`** for async routes to catch errors
4. **Use request logger** (`req.logger`) instead of base logger, for automatic request ID
5. **Throw `@batkit/errors`** for consistent error handling
6. **Don't expose stack traces** in production (default behavior)

## Example: Complete Setup

```typescript
import { contextMiddleware, errorHandler, asyncHandler } from '@batkit/express-middleware';
import { NotFoundError, ValidationError } from '@batkit/errors';
import { createPinoLogger } from '@batkit/logger-pino';
import express from 'express';

const app = express();
const logger = createPinoLogger();

// Middleware
app.use(express.json());
app.use(contextMiddleware({ logger }));

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/users/:id', asyncHandler(async (req, res) => {
  req.logger.info('Fetching user', { userId: req.params.id });

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

Full TypeScript support with Express type extensions:

```typescript
import type { Request } from 'express';

app.get('/test', (req: Request, res) => {
  // TypeScript knows about these
  req.context?.requestId;
  req.logger?.info('Test');
});
```

## License

MIT © Ken Courville
