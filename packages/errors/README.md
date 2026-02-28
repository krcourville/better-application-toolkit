# @batkit/errors

Standardized error classes with structured troubleshooting information for Node.js and browser environments.

## Installation

```bash
npm install @batkit/errors
```

## Overview

This package provides a comprehensive set of error classes that extend the native `Error` with:
- HTTP status codes
- Machine-readable error codes
- Structured details for troubleshooting
- RFC 9457 Problem Details support
- Operational vs programmer error distinction
- TypeScript support with full type safety

Works in both Node.js and browser environments.

## Features

- ✅ Pre-built error classes for common HTTP status codes
- ✅ Automatic RFC 9457 Problem Details conversion
- ✅ Type guards for error identification
- ✅ Structured error details
- ✅ TypeScript-first design
- ✅ Universal (Node.js + Browser)
- ✅ ESM and CommonJS support

## Usage

### Basic Errors

```typescript
import { NotFoundError, ValidationError, UnauthorizedError } from '@batkit/errors';

// 404 Not Found - requires entity info
throw new NotFoundError('User', '123');
// Error: User with id '123' was not found

// 401 Unauthorized
throw new UnauthorizedError('Invalid API token');

// 400 Validation Error - with structured details
throw new ValidationError('Invalid request body', [
  { field: 'email', message: 'Must be a valid email address' },
  { field: 'age', message: 'Must be a positive number', value: -5 }
]);
```

### RFC 9457 Problem Details

All errors can be converted to RFC 9457 format:

```typescript
import { NotFoundError } from '@batkit/errors';

const error = new NotFoundError('User', '123');
const problemDetails = error.toRFC9457();

console.log(problemDetails);
// {
//   type: 'error:not-found',
//   title: 'Resource Not Found',
//   status: 404,
//   detail: "User with id '123' was not found",
//   entityName: 'User',
//   entityId: '123'
// }
```

### Custom Error Details

```typescript
import { AppError, ConflictError } from '@batkit/errors';

// Using the base class
throw new AppError(418, "I'm a teapot", 'TEAPOT_ERROR', {
  teapotId: '42',
  reason: 'short and stout'
});

// Using specific error with details
throw new ConflictError(
  'Email address already registered',
  'User',
  'user@example.com'
);
```

### Type Guards

```typescript
import {
  isAppError,
  isValidationError,
  isNotFoundError,
  isOperationalError,
  getStatusCode,
  getErrorCode
} from '@batkit/errors';

try {
  // ... some code
} catch (error) {
  if (isValidationError(error)) {
    console.log('Validation errors:', error.validationErrors);
  } else if (isNotFoundError(error)) {
    console.log(`${error.entityName} not found:`, error.entityId);
  } else if (isAppError(error)) {
    console.log(`Error ${error.code}:`, error.message);
  }

  // Get status code safely
  const status = getStatusCode(error); // defaults to 500

  // Check if operational
  if (isOperationalError(error)) {
    // This is an expected error, handle gracefully
  } else {
    // This is a bug, log and alert
  }
}
```

## Available Error Classes

| Class | Status | Description | Required Fields |
|-------|--------|-------------|-----------------|
| `AppError` | Custom | Base class for all errors | statusCode, message |
| `BadRequestError` | 400 | Malformed request | - |
| `ValidationError` | 400 | Validation failed | validationErrors |
| `UnauthorizedError` | 401 | Authentication required/failed | - |
| `ForbiddenError` | 403 | Permission denied | - |
| `NotFoundError` | 404 | Resource not found | entityName, entityId |
| `ConflictError` | 409 | Resource conflict | message |
| `UnprocessableEntityError` | 422 | Semantically invalid | message |
| `TooManyRequestsError` | 429 | Rate limit exceeded | - |
| `InternalServerError` | 500 | Unexpected server error | - |
| `NotImplementedError` | 501 | Feature not implemented | - |
| `BadGatewayError` | 502 | Upstream server error | - |
| `ServiceUnavailableError` | 503 | Service temporarily unavailable | - |
| `GatewayTimeoutError` | 504 | Upstream timeout | - |

## API Reference

### `AppError`

Base class for all application errors.

```typescript
new AppError(
  statusCode: number,
  message: string,
  code?: string,
  details?: Record<string, unknown>,
  isOperational?: boolean
)
```

**Properties:**
- `statusCode: number` - HTTP status code
- `message: string` - Error message
- `code: string` - Machine-readable error code
- `details?: Record<string, unknown>` - Additional structured data
- `isOperational: boolean` - Whether this is an expected error
- `timestamp: Date` - When the error occurred

**Methods:**
- `toRFC9457()` - Convert to RFC 9457 Problem Details
- `toJSON()` - JSON representation (includes stack in non-production)

### Type Guards

#### `isAppError(error: unknown): error is AppError`
Check if error is an AppError instance.

#### `isOperationalError(error: unknown): boolean`
Check if error is operational (expected) vs programmer error.

#### `isValidationError(error: unknown): error is ValidationError`
Check if error is a ValidationError.

#### `isNotFoundError(error: unknown): error is NotFoundError`
Check if error is a NotFoundError.

#### `isUnauthorizedError(error: unknown): error is UnauthorizedError`
Check if error is an Un authorizedError.

#### `isForbiddenError(error: unknown): error is ForbiddenError`
Check if error is a ForbiddenError.

### Utility Functions

#### `getStatusCode(error: unknown): number`
Extract HTTP status code from error, defaults to 500.

#### `getErrorCode(error: unknown): string`
Extract machine-readable error code, defaults to 'UNKNOWN'.

## Integration with Express

Use with [@batkit/express-middleware](../express-middleware) for automatic error handling:

```typescript
import { errorHandler } from '@batkit/express-middleware';
import { NotFoundError } from '@batkit/errors';
import express from 'express';

const app = express();

app.get('/users/:id', (req, res) => {
  throw new NotFoundError('User', req.params.id);
});

// Automatically converts to RFC 9457 format
app.use(errorHandler());
```

## Best Practices

1. **Use specific error classes** instead of generic AppError when possible
2. **Provide structured details** to help with troubleshooting
3. **Distinguish operational errors** from programmer errors
4. **Include entity information** in NotFoundError for better debugging
5. **Use ValidationError** for all input validation failures with field-level details

## TypeScript

Full TypeScript support with exported types:

```typescript
import type { AppError, ValidationError } from '@batkit/errors';

function handleError(error: AppError) {
  console.log(`[${error.code}] ${error.message}`);
  if (error.details) {
    console.log('Details:', error.details);
  }
}
```

## License

MIT © Ken Courville
