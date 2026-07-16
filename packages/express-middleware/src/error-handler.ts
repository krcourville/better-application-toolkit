import { isAppError } from "@batkit/errors";
import { LoggerFacade } from "@batkit/logger";
import {
  type ExtendedProblemDetails,
  PROBLEM_DETAILS_CONTENT_TYPE,
  createExtendedProblemDetails,
} from "@batkit/rfc9457";
import type { NextFunction, Request, Response } from "express";

const logger = LoggerFacade.getLogger("error-handler");

const HttpStatus = {
  BAD_GATEWAY: 502,
  INTERNAL_SERVER_ERROR: 500,
  UNPROCESSABLE_ENTITY: 422,
} as const;
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
        detail: error.message,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        title: "Internal Server Error",
        type: "error:internal",
      });
    }

    // Unknown error type
    return createExtendedProblemDetails({
      detail: "An unknown error occurred",
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      title: "Unknown Error",
      type: "error:unknown",
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
    const status =
      ((error.response as Record<string, unknown>)?.status as number) || HttpStatus.BAD_GATEWAY;
    return createExtendedProblemDetails({
      detail: error.message as string,
      status,
      title: "Upstream Service Error",
      type: "error:upstream",
      upstreamMethod: ((error.config as Record<string, unknown>)?.method as string)?.toUpperCase(),
      upstreamStatus: (error.response as Record<string, unknown>)?.status as number | undefined,
      upstreamUrl: (error.config as Record<string, unknown>)?.url as string | undefined,
    });
  }

  private formatZodError(error: Record<string, unknown>): ExtendedProblemDetails {
    const validationErrors = (error.issues as Record<string, unknown>[]).map((issue) => ({
      code: issue.code as string,
      field: (issue.path as unknown[]).join("."),
      message: issue.message as string,
    }));

    return createExtendedProblemDetails({
      detail: "Request validation failed",
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      title: "Validation Error",
      type: "error:validation",
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
   * Whether to log errors (default: true)
   */
  logErrors?: boolean;

  /**
   * Custom error logger function
   */
  onError?: (error: unknown, req: Request) => void;
}

function logHandledError(error: Error, req: Request, options: ErrorHandlerOptions): void {
  const { onError } = options;
  if (onError) {
    onError(error, req);
    return;
  }

  if (isAppError(error) && error.isOperational) {
    logger.warn("Operational error occurred", {
      code: error.code,
      error: error.message,
      method: req.method,
      path: req.path,
      statusCode: error.statusCode,
    });
    return;
  }

  const contentType = req.headers?.["content-type"];
  const isJsonContentType =
    typeof contentType === "string" && /^application\/(?:[^;]+\+)?json/iu.test(contentType);
  const isBinaryBody =
    Buffer.isBuffer(req.body) || (contentType !== undefined && !isJsonContentType);

  let bodyLength: number | undefined;
  if (Buffer.isBuffer(req.body)) {
    bodyLength = req.body.length;
  } else if (typeof req.body === "string") {
    bodyLength = Buffer.byteLength(req.body);
  }

  logger.error(error, {
    method: req.method,
    path: req.path,
    query: req.query,
    ...(isBinaryBody ? { bodyContentType: contentType, bodyLength } : { body: req.body }),
  });
}

function buildProblemDetails(error: Error, formatters: ErrorFormatter[]): ExtendedProblemDetails {
  const formatter = formatters.find((candidate) => candidate.canFormat(error));
  return formatter
    ? formatter.format(error)
    : createExtendedProblemDetails({
        detail: "An unexpected error occurred",
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        title: "Internal Server Error",
        type: "error:internal",
      });
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
  // oxlint-disable-next-line max-params -- Express detects error-handling middleware by function arity; this signature must stay exactly (error, req, res, next).
): (error: Error, req: Request, res: Response, next: NextFunction) => void {
  const { formatters = [new DefaultErrorFormatter()], logErrors = true } = options;

  // oxlint-disable-next-line max-params -- see above, Express requires this exact arity.
  return (error: Error, req: Request, res: Response, next: NextFunction): void => {
    // If headers already sent, delegate to default Express error handler
    if (res.headersSent) {
      next(error);
      return;
    }

    if (logErrors) {
      logHandledError(error, req, options);
    }

    const problemDetails = buildProblemDetails(error, formatters);

    // Add stack trace
    if (error.stack) {
      problemDetails.stack = error.stack.split("\n").map((line) => line.trim());
    }

    // Add instance (request path)
    if (!problemDetails.instance) {
      problemDetails.instance = req.path;
    }

    // Send RFC 9457 response
    res
      .status(problemDetails.status || HttpStatus.INTERNAL_SERVER_ERROR)
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
