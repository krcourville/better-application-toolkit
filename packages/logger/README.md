# @batkit/logger

Logger facade with default console implementation for Node.js and browser environments.

## Installation

```bash
npm install @batkit/logger
```

## Overview

A lightweight logger facade that provides a consistent logging interface for both Node.js and browser environments. Includes a production-ready console logger implementation with structured logging support.

## Features

- ✅ Simple, intuitive API
- ✅ Works in Node.js and browsers
- ✅ Structured logging support
- ✅ Child loggers with context
- ✅ Log level filtering
- ✅ Pretty and JSON output modes
- ✅ Zero dependencies
- ✅ TypeScript-first
- ✅ ESM and CommonJS support

## Usage

### Basic Logging

```typescript
import { createConsoleLogger, LogLevel } from '@batkit/logger';

const logger = createConsoleLogger({ level: LogLevel.INFO });

logger.debug('Debug message'); // Won't be logged (below INFO level)
logger.info('Application started');
logger.warn('Low disk space');
logger.error('Failed to connect to database');
```

### Structured Logging

```typescript
import { createConsoleLogger } from '@batkit/logger';

const logger = createConsoleLogger();

// Add structured data to logs
logger.info('User logged in', {
  userId: '123',
  timestamp: Date.now(),
  ipAddress: '192.168.1.1'
});

// Error logging
try {
  // ... some code
} catch (error) {
  logger.error('Operation failed', error, { operation: 'createUser' });
}
```

### Child Loggers with Context

```typescript
import { createConsoleLogger } from '@batkit/logger';

const baseLogger = createConsoleLogger({
  context: { app: 'my-api', env: 'production' }
});

// Create child logger with additional context
const requestLogger = baseLogger.child({
  requestId: '550e8400-e29b-41d4-a716-446655440000'
});

requestLogger.info('Processing request');
// Logs will include: app, env, and requestId
```

### Using the Factory

```typescript
import { ConsoleLoggerFactory, LogLevel } from '@batkit/logger';

const factory = new ConsoleLoggerFactory({
  level: LogLevel.DEBUG,
  context: { service: 'api' }
});

const logger1 = factory.createLogger({ module: 'auth' });
const logger2 = factory.createLogger({ module: 'users' });

logger1.info('Auth check'); // Includes service: 'api', module: 'auth'
logger2.info('User created'); // Includes service: 'api', module: 'users'
```

### JSON Output

```typescript
import { createConsoleLogger, LogLevel } from '@batkit/logger';

const logger = createConsoleLogger({
  level: LogLevel.INFO,
  pretty: false // Outputs structured JSON
});

logger.info('User action', { userId: '123', action: 'login' });
// Output: {"level":"info","message":"User action","timestamp":"2026-02-28T...","userId":"123","action":"login"}
```

## API Reference

### Types

#### `Logger`

```typescript
interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  child(context: LoggerContext): Logger;
}
```

#### `LogLevel`

```typescript
enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}
```

#### `LoggerOptions`

```typescript
interface LoggerOptions {
  level?: LogLevel;
  context?: LoggerContext;
  pretty?: boolean; // Default: true
}
```

### Functions

#### `createConsoleLogger(options?): Logger`

Creates a console logger instance.

**Parameters:**
- `options`: Optional `LoggerOptions`

**Returns:** `Logger` instance

### Classes

#### `ConsoleLogger`

Console-based logger implementation.

```typescript
new ConsoleLogger(options?: LoggerOptions)
```

#### `ConsoleLoggerFactory`

Factory for creating console logger instances with shared configuration.

```typescript
new ConsoleLoggerFactory(defaultOptions?: LoggerOptions)
```

**Methods:**
- `createLogger(context?: LoggerContext): Logger` - Create a new logger instance

## Using with Other Implementations

This package provides the logger facade. You can use alternative implementations:

- [@batkit/logger-pino](../logger-pino) - Pino.js based implementation (recommended for production)

```typescript
import type { Logger } from '@batkit/logger';
import { createPinoLogger } from '@batkit/logger-pino';

const logger: Logger = createPinoLogger({
  level: 'info'
});

logger.info('Using Pino implementation');
```

## Integration with Express

Use with [@batkit/express-middleware](../express-middleware) for request context logging:

```typescript
import { createConsoleLogger } from '@batkit/logger';
import { contextMiddleware } from '@batkit/express-middleware';
import express from 'express';

const app = express();
const logger = createConsoleLogger();

// Add request context to all logs
app.use(contextMiddleware({ logger }));

app.get('/users', (req, res) => {
  // Logger automatically includes request ID
  req.logger.info('Fetching users');
  res.json({ users: [] });
});
```

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

3. **Use child loggers** for request/context-specific logging

4. **Include errors as separate arguments**:
   ```typescript
   logger.error('Failed to save user', error, { userId });
   ```

## TypeScript

Full TypeScript support with exported types:

```typescript
import type { Logger, LoggerContext, LoggerFactory } from '@batkit/logger';

function setupLogger(factory: LoggerFactory): Logger {
  return factory.createLogger({ service: 'api' });
}
```

## Tree-Shaking

For optimal tree-shaking, import from the specific entry point:

```typescript
// Import only the console logger
import { createConsoleLogger } from '@batkit/logger/console';
```

## License

MIT © Ken Courville
