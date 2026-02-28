import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { Logger } from '@batkit/logger';
import type { NextFunction, Request, Response } from 'express';

/**
 * Request context stored in AsyncLocalStorage
 */
export interface RequestContext {
  /**
   * Unique identifier for this request
   */
  requestId: string;

  /**
   * Request-scoped logger with requestId
   */
  logger: Logger;

  /**
   * User ID if authenticated
   */
  userId?: string;

  /**
   * Additional metadata that can be added during request processing
   */
  metadata: Record<string, unknown>;
}

declare global {
  namespace Express {
    interface Request {
      /**
       * Request context with logger and metadata
       */
      context?: RequestContext;

      /**
       * Convenience accessor for context logger
       */
      logger?: Logger;
    }
  }
}

/**
 * AsyncLocalStorage instance for request context
 */
const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Get the current request context
 * @returns The current RequestContext or undefined if not in a request
 */
export function getContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

/**
 * Set a value in the current request context metadata
 * @param key - Metadata key
 * @param value - Metadata value
 */
export function setContextValue(key: string, value: unknown): void {
  const context = getContext();
  if (context) {
    context.metadata[key] = value;
  }
}

/**
 * Get a value from the current request context metadata
 * @param key - Metadata key
 * @returns The metadata value or undefined
 */
export function getContextValue(key: string): unknown {
  const context = getContext();
  return context?.metadata[key];
}

/**
 * Options for context middleware
 */
export interface ContextMiddlewareOptions {
  /**
   * Base logger to use for creating request-scoped loggers
   */
  logger: Logger;

  /**
   * Function to generate request IDs (default: randomUUID)
   */
  generateRequestId?: () => string;

  /**
   * Function to extract user ID from request
   */
  getUserId?: (req: Request) => string | undefined;

  /**
   * Request header name to read request ID from (if present)
   * Default: 'x-request-id'
   */
  requestIdHeader?: string;
}

/**
 * Express middleware that creates request context using AsyncLocalStorage
 *
 * @param options - Configuration options
 * @returns Express middleware function
 *
 * @example
 * ```ts
 * import { createConsoleLogger } from '@batkit/logger';
 * import { contextMiddleware } from '@batkit/express-middleware';
 * import express from 'express';
 *
 * const app = express();
 * const logger = createConsoleLogger();
 *
 * app.use(contextMiddleware({ logger }));
 *
 * app.get('/users', (req, res) => {
 *   req.logger.info('Fetching users');
 *   res.json({ users: [] });
 * });
 * ```
 */
export function contextMiddleware(
  options: ContextMiddlewareOptions
): (req: Request, res: Response, next: NextFunction) => void {
  const {
    logger: baseLogger,
    generateRequestId = randomUUID,
    getUserId,
    requestIdHeader = 'x-request-id',
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Get or generate request ID
    const requestId = (req.headers[requestIdHeader.toLowerCase()] as string) || generateRequestId();

    // Create request-scoped logger
    const logger = baseLogger.child({ requestId });

    // Get user ID if available
    const userId = getUserId?.(req);

    const context: RequestContext = {
      requestId,
      logger,
      userId,
      metadata: {},
    };

    // Attach context to request for convenience
    req.context = context;
    req.logger = logger;

    // Set request ID in response header
    res.setHeader('x-request-id', requestId);

    // Run the rest of the request in this context
    requestContextStorage.run(context, () => {
      next();
    });
  };
}
