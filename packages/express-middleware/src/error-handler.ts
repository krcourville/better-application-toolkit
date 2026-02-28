import { isAppError } from '@batkit/errors';
import {
  type ExtendedProblemDetails,
  PROBLEM_DETAILS_CONTENT_TYPE,
  createExtendedProblemDetails,
} from '@batkit/rfc9457';
import type { NextFunction, Request, Response } from 'express';
import { getContext } from './context.js';

/**
 * Interface for custom error formatters
 */
export interface ErrorFormatter {
  /**
   * Check if this formatter can handle the error
   */
  canFormat(error: unknown): boolean;

  /**
   * Format the error as RFC 9457 Problem Details
   */
  format(error: unknown): ExtendedProblemDetails;
}

/**
 * Default error formatter that handles common error types
 */
export class DefaultErrorFormatter implements ErrorFormatter {
  canFormat(error: unknown): boolean {
    return (
      isAppError(error) ||
      error instanceof Error ||
      this.isAxiosError(error) ||
      this.isZodError(error)
    );
  }

  format(error: unknown): ExtendedProblemDetails {
    // Handle AppError (from @batkit/errors)
    if (isAppError(error)) {
      return error.toRFC9457();
    }

    // Handle Axios errors
    if (this.isAxiosError(error)) {
      return this.formatAxiosError(error as any);
    }

    // Handle Zod validation errors
    if (this.isZodError(error)) {
      return this.formatZodError(error as any);
    }

    // Handle generic Error
    if (error instanceof Error) {
      return createExtendedProblemDetails({
        type: 'error:internal',
        title: 'Internal Server Error',
        status: 500,
        detail: error.message,
      });
    }

    // Unknown error type
    return createExtendedProblemDetails({
      type: 'error:unknown',
      title: 'Unknown Error',
      status: 500,
      detail: 'An unknown error occurred',
    });
  }

  private isAxiosError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'isAxiosError' in error &&
      error.isAxiosError === true
    );
  }

  private isZodError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'issues' in error &&
      Array.isArray((error as any).issues)
    );
  }

  private formatAxiosError(error: any): ExtendedProblemDetails {
    const status = error.response?.status || 502;
    return createExtendedProblemDetails({
      type: 'error:upstream',
      title: 'Upstream Service Error',
      status,
      detail: error.message,
      upstreamUrl: error.config?.url,
      upstreamMethod: error.config?.method?.toUpperCase(),
      upstreamStatus: error.response?.status,
    });
  }

  private formatZodError(error: any): ExtendedProblemDetails {
    const validationErrors = error.issues.map((issue: any) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    return createExtendedProblemDetails({
      type: 'error:validation',
      title: 'Validation Error',
      status: 400,
      detail: 'Request validation failed',
      validationErrors,
    });
  }
}

/**
 * Options for error handler middleware
 */
export interface ErrorHandlerOptions {
  /**
   * Custom error formatters (in order of precedence)
   */
  formatters?: ErrorFormatter[];

  /**
   * Whether to include stack traces in responses (default: only in non-production)
   */
  includeStack?: boolean;

  /**
   * Whether to log errors (default: true)
   */
  logErrors?: boolean;

  /**
   * Custom error logger function
   */
  onError?: (error: unknown, req: Request) => void;
}

/**
 * Express error handling middleware that converts errors to RFC 9457 format
 *
 * @param options - Configuration options
 * @returns Express error middleware function
 *
 * @example
 * ```ts
 * import { errorHandler } from '@batkit/express-middleware';
 * import { NotFoundError } from '@batkit/errors';
 * import express from 'express';
 *
 * const app = express();
 *
 * app.get('/users/:id', (req, res) => {
 *   throw new NotFoundError('User', req.params.id);
 * });
 *
 * // Must be added AFTER all routes
 * app.use(errorHandler());
 * ```
 */
export function errorHandler(
  options: ErrorHandlerOptions = {}
): (error: Error, req: Request, res: Response, next: NextFunction) => void {
  const {
    formatters = [new DefaultErrorFormatter()],
    includeStack = process.env['NODE_ENV'] !== 'production',
    logErrors = true,
    onError,
  } = options;

  return (error: Error, req: Request, res: Response, next: NextFunction): void => {
    // If headers already sent, delegate to default Express error handler
    if (res.headersSent) {
      return next(error);
    }

    // Log the error
    if (logErrors) {
      if (onError) {
        onError(error, req);
      } else {
        const context = getContext();
        const logger = context?.logger || console;

        if (isAppError(error) && error.isOperational) {
          logger.warn?.('Operational error occurred', {
            error: error.message,
            code: error.code,
            statusCode: error.statusCode,
            path: req.path,
            method: req.method,
          });
        } else {
          logger.error?.('Unhandled error occurred', error, {
            path: req.path,
            method: req.method,
            query: req.query,
            body: req.body,
          });
        }
      }
    }

    // Format the error
    let problemDetails: ExtendedProblemDetails;

    const formatter = formatters.find((f) => f.canFormat(error));
    if (formatter) {
      problemDetails = formatter.format(error);
    } else {
      // Fallback to generic error
      problemDetails = createExtendedProblemDetails({
        type: 'error:internal',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred',
      });
    }

    // Add stack trace if enabled
    if (includeStack && error.stack) {
      (problemDetails as any).stack = error.stack.split('\n').map((line) => line.trim());
    }

    // Add instance (request path)
    if (!problemDetails.instance) {
      problemDetails.instance = req.path;
    }

    // Send RFC 9457 response
    res
      .status(problemDetails.status || 500)
      .set('Content-Type', PROBLEM_DETAILS_CONTENT_TYPE)
      .json(problemDetails);
  };
}

/**
 * Express middleware to catch async errors
 * Wraps async route handlers to ensure errors are passed to error middleware
 *
 * @param fn - Async route handler
 * @returns Wrapped route handler
 *
 * @example
 * ```ts
 * import { asyncHandler } from '@batkit/express-middleware';
 *
 * app.get('/users/:id', asyncHandler(async (req, res) => {
 *   const user = await db.users.findById(req.params.id);
 *   if (!user) {
 *     throw new NotFoundError('User', req.params.id);
 *   }
 *   res.json(user);
 * }));
 * ```
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
