# @batkit/rfc9457

Zod schemas and TypeScript types for RFC 9457 (Problem Details for HTTP APIs).

## Installation

```bash
npm install @batkit/rfc9457
```

## Overview

This package provides ready-to-use Zod schemas, TypeScript types, and utility functions for working with [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html) Problem Details in HTTP APIs. It works in both Node.js and browser environments.

## Features

- ✅ Full RFC 9457 compliance
- ✅ Zod schemas for runtime validation
- ✅ TypeScript types for compile-time safety
- ✅ Support for extension members
- ✅ Helper functions for creating and validating Problem Details
- ✅ Works in Node.js and browsers
- ✅ ESM and CommonJS support

## Usage

### Basic Example

```typescript
import { createProblemDetails, PROBLEM_DETAILS_CONTENT_TYPE } from '@batkit/rfc9457';

// Create a problem details object
const problem = createProblemDetails({
  status: 404,
  title: 'Resource Not Found',
  detail: 'The requested user was not found',
  instance: '/users/123',
});

// Use in an HTTP response
res
  .status(problem.status!)
  .set('Content-Type', PROBLEM_DETAILS_CONTENT_TYPE)
  .json(problem);
```

### Validation

```typescript
import { validateProblemDetails, isProblemDetails } from '@batkit/rfc9457';

// Validate an object
const result = validateProblemDetails(data);
if (result.success) {
  console.log('Valid problem details:', result.data);
} else {
  console.error('Validation errors:', result.error);
}

// Type guard
if (isProblemDetails(response)) {
  console.log(`Error status: ${response.status}`);
}
```

### Extended Problem Details

RFC 9457 allows adding custom fields to problem details:

```typescript
import { createExtendedProblemDetails } from '@batkit/rfc9457';

interface ValidationProblem {
  validationErrors: Array<{ field: string; message: string }>;
}

const problem = createExtendedProblemDetails<ValidationProblem>({
  type: 'https://api.example.com/errors/validation',
  status: 400,
  title: 'Validation Failed',
  detail: 'The request body contains invalid data',
  validationErrors: [
    { field: 'email', message: 'Must be a valid email address' },
    { field: 'age', message: 'Must be a positive integer' },
  ],
});
```

### Using Schemas Directly

```typescript
import { ProblemDetailsSchema, ExtendedProblemDetailsSchema } from '@batkit/rfc9457';

// Parse and validate
const problem = ProblemDetailsSchema.parse({
  status: 500,
  title: 'Internal Server Error',
});

// With custom fields
const extendedProblem = ExtendedProblemDetailsSchema.parse({
  status: 503,
  title: 'Service Unavailable',
  retryAfter: 60,
});
```

### Creating Headers

```typescript
import { createProblemDetailsHeaders } from '@batkit/rfc9457';

// Basic headers
const headers = createProblemDetailsHeaders();
// { 'Content-Type': 'application/problem+json' }

// With additional headers
const headersWithCors = createProblemDetailsHeaders({
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-cache',
});
```

## API Reference

### Types

#### `ProblemDetails`

TypeScript type for RFC 9457 Problem Details:

```typescript
interface ProblemDetails {
  type?: string; // Default: 'about:blank'
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
}
```

#### `ExtendedProblemDetails`

Type for Problem Details with additional custom fields:

```typescript
type ExtendedProblemDetails = ProblemDetails & Record<string, unknown>;
```

### Schemas

#### `ProblemDetailsSchema`

Zod schema for standard RFC 9457 Problem Details. Does not allow additional properties.

#### `ExtendedProblemDetailsSchema`

Zod schema that allows additional properties for custom extensions.

### Functions

#### `validateProblemDetails(data: unknown)`

Validates a problem details object against the RFC 9457 schema.

**Returns:** `SafeParseReturnType` from Zod

#### `validateExtendedProblemDetails(data: unknown)`

Validates an extended problem details object (allows additional properties).

**Returns:** `SafeParseReturnType` from Zod

#### `createProblemDetails(details)`

Creates a Problem Details object with proper defaults.

**Parameters:**
- `details`: Partial problem details (requires `status`)

**Returns:** `ProblemDetails`

#### `createExtendedProblemDetails<T>(details)`

Creates an extended Problem Details object with additional typed properties.

**Type Parameters:**
- `T`: Additional properties type

**Parameters:**
- `details`: Problem details with additional properties (requires `status`)

**Returns:** `ExtendedProblemDetails & T`

#### `createProblemDetailsHeaders(additionalHeaders?)`

Helper to create HTTP response headers for Problem Details.

**Parameters:**
- `additionalHeaders`: Optional additional headers

**Returns:** Headers object with Content-Type set to `application/problem+json`

#### `isProblemDetails(value: unknown)`

Type guard to check if an object is a valid Problem Details object.

**Returns:** `boolean`

### Constants

#### `PROBLEM_DETAILS_CONTENT_TYPE`

The RFC 9457 content type: `'application/problem+json'`

## RFC 9457 Compliance

This package implements the full RFC 9457 specification:

- **type**: URI reference identifying the problem type (default: `about:blank`)
- **title**: Short, human-readable summary
- **status**: HTTP status code (validated to be 100-599)
- **detail**: Human-readable explanation
- **instance**: URI reference identifying this specific occurrence
- **Extension members**: Additional properties allowed in extended schema

## Browser Compatibility

This package works in all modern browsers and Node.js environments. It has no Node.js-specific dependencies.

## Related Packages

- [@batkit/errors](../errors) - Standardized error classes that integrate with RFC 9457
- [@batkit/express-middleware](../express-middleware) - Express middleware that automatically formats errors as RFC 9457

## License

MIT © Ken Courville
