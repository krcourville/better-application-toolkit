import { isAppError } from "@batkit/errors";
import { LoggerFacade } from "@batkit/logger";
import {
  type ExtendedProblemDetails,
  PROBLEM_DETAILS_CONTENT_TYPE,
  createExtendedProblemDetails,
} from "@batkit/rfc9457";
import type { NextFunction, Request, Response } from "express";

const logger = LoggerFacade.getLogger("error-handler");
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
      return this.formatAxiosError(error as Record<string, unknown>);
    }

    // Handle Zod validation errors
    if (this.isZodError(error)) {
      return this.formatZodError(error as Record<string, unknown>);
    }

    // Handle generic Error
    if (error instanceof Error) {
      return createExtendedProblemDetails({
        type: "error:internal",
        title: "Internal Server Error",
        status: 500,
        detail: error.message,
      });
    }

    // Unknown error type
    return createExtendedProblemDetails({
      type: "error:unknown",
      title: "Unknown Error",
      status: 500,
      detail: "An unknown error occurred",
    });
  }

  private isAxiosError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "isAxiosError" in error &&
      error.isAxiosError === true
    );
  }

  private isZodError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "issues" in error &&
      Array.isArray((error as Record<string, unknown>).issues)
    );
  }

  private formatAxiosError(error: Record<string, unknown>): ExtendedProblemDetails {
    const status = ((error.response as Record<string, unknown>)?.status as number) || 502;
    return createExtendedProblemDetails({
      type: "error:upstream",
      title: "Upstream Service Error",
      status,
      detail: error.message as string,
      upstreamUrl: (error.config as Record<string, unknown>)?.url as string | undefined,
      upstreamMethod: ((error.config as Record<string, unknown>)?.method as string)?.toUpperCase(),
      upstreamStatus: (error.response as Record<string, unknown>)?.status as number | undefined,
    });
  }

  private formatZodError(error: Record<string, unknown>): ExtendedProblemDetails {
    const validationErrors = (error.issues as Array<Record<string, unknown>>).map((issue) => ({
      field: (issue.path as unknown[]).join("."),
      message: issue.message as string,
      code: issue.code as string,
    }));

    return createExtendedProblemDetails({
      type: "error:validation",
      title: "Validation Error",
      status: 400,
      detail: "Request validation failed",
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
  options: ErrorHandlerOptions = {},
): (error: Error, req: Request, res: Response, next: NextFunction) => void {
  const {
    formatters = [new DefaultErrorFormatter()],
    includeStack = true,
    logErrors = true,
    onError,
  } = options;

  return (error: Error, req: Request, res: Response, next: NextFunction): void => {
    // If headers already sent, delegate to default Express error handler
    if (res.headersSent) {
      next(error);
      return;
    }

    // Log the error
    if (logErrors) {
      if (onError) {
        onError(error, req);
      } else {
        if (isAppError(error) && error.isOperational) {
          logger.warn("Operational error occurred", {
            error: error.message,
            code: error.code,
            statusCode: error.statusCode,
            path: req.path,
            method: req.method,
          });
        } else {
          logger.error(error, {
            path: req.path,
            method: req.method,
            querd: req.method,
            consoley: req.query,
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
        type: "error:internal",
        title: "Internal Server Error",
        status: 500,
        detail: "An unexpected error occurred",
      });
    }

    // Add stack trace if enabled
    if (includeStack && error.stack) {
      problemDetails.stack = error.stack.split("\n").map((line) => line.trim());
    }

    // Add instance (request path)
    if (!problemDetails.instance) {
      problemDetails.instance = req.path;
    }

    // Send RFC 9457 response
    res
      .status(problemDetails.status || 500)
      .set("Content-Type", PROBLEM_DETAILS_CONTENT_TYPE)
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
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
