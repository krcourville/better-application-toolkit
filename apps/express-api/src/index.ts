import { contextMiddleware, errorHandler } from '@batkit/express-middleware';
import { createExtendedProblemDetails } from '@batkit/rfc9457';
import { createDevLogger, createProdLogger } from '@batkit/logger-pino';
import { apiReference } from '@scalar/express-api-reference';
import { createExpressEndpoints, initServer } from '@ts-rest/express';
import { generateOpenApi } from '@ts-rest/open-api';
import 'dotenv/config';
import express from 'express';
import { apiContract } from './contract.js';
import { contextHandlers } from './routes/context.js';
import { errorHandlers } from './routes/errors.js';
import { userHandlers } from './routes/users.js';

const PORT = process.env['PORT'] || 3000;
const NODE_ENV = process.env['NODE_ENV'] || 'development';
const IS_DEV = NODE_ENV === 'development';

// Create logger based on environment
const logger = IS_DEV
  ? createDevLogger({ app: 'express-api' })
  : createProdLogger({ app: 'express-api' });

// Create Express app
const app = express();
const server = initServer();

// Built-in middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add request context middleware
app.use(
  contextMiddleware({
    logger,
    // In a real app, you'd extract user ID from authentication middleware
    getUserId: (req) => req.headers['x-user-id'] as string | undefined,
  })
);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
  });
});

const apiInfo = {
  message: 'Better Application Toolkit - Express API Reference',
  version: '1.0.0',
  endpoints: {
    health: 'GET /health',
    openApi: 'GET /openapi.json',
    docs: 'GET /docs',
    users: {
      list: 'GET /api/users',
      get: 'GET /api/users/:id',
      create: 'POST /api/users',
      update: 'PUT /api/users/:id',
      delete: 'DELETE /api/users/:id',
    },
    errors: {
      badRequest: 'GET /api/errors/400',
      unauthorized: 'GET /api/errors/401',
      forbidden: 'GET /api/errors/403',
      notFound: 'GET /api/errors/404',
      conflict: 'GET /api/errors/409',
      validation: 'GET /api/errors/422',
      rateLimit: 'GET /api/errors/429',
      internal: 'GET /api/errors/500',
      serviceUnavailable: 'GET /api/errors/503',
      generic: 'GET /api/errors/generic',
    },
    context: {
      show: 'GET /api/context',
      nested: 'GET /api/context/nested',
    },
  },
};

const openApiSpec = generateOpenApi(apiContract, {
  info: {
    title: 'Better Application Toolkit - Express API Reference',
    version: '1.0.0',
    description: 'Reference API built with ts-rest and BAT middleware.',
  },
  servers: [{ url: `http://localhost:${PORT}` }],
});

const router = server.router(apiContract, {
  info: async () => ({
    status: 200,
    body: apiInfo,
  }),
  users: userHandlers,
  errors: errorHandlers,
  context: contextHandlers,
});

createExpressEndpoints(apiContract, router, app);

// Middleware to intercept and transform ts-rest validation errors to RFC 9457
app.use((_req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = function (body: any) {
    // Check if this is a Zod error response (has 'issues' array and 'name' field)
    if (
      body &&
      typeof body === 'object' &&
      'issues' in body &&
      Array.isArray(body.issues) &&
      'name' in body &&
      body.name === 'ZodError'
    ) {
      const validationErrors = body.issues.map((issue: any) => ({
        field: issue.path.join('.') || 'root',
        message: issue.message,
        code: issue.code,
      }));

      const problemDetails = createExtendedProblemDetails({
        type: 'error:validation',
        title: 'Validation Error',
        status: 400,
        detail: 'Request validation failed',
        validationErrors,
      });

      // Send the RFC 9457 formatted response
      res.status(400);
      return originalJson.call(res, problemDetails);
    }

    // For all other responses, pass through normally
    return originalJson.call(res, body);
  };

  next();
});

app.get('/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});

app.use(
  '/docs',
  apiReference({
    spec: {
      url: '/openapi.json',
    },
  })
);

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    type: 'error:not-found',
    title: 'Route Not Found',
    status: 404,
    detail: `The route ${req.method} ${req.path} does not exist`,
    instance: req.path,
  });
});

// Error handler middleware (MUST be last)
app.use(
  errorHandler({
    includeStack: IS_DEV,
  })
);

// Start server
const httpServer = app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`, {
    port: PORT,
    environment: NODE_ENV,
    logLevel: IS_DEV ? 'debug' : 'info',
  });
});

// Graceful shutdown
const shutdown = (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown`);

  httpServer.close(() => {
    logger.info('Server closed, exiting process');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
  process.exit(1);
});
