import type { ExtendedProblemDetails } from '@batkit/rfc9457';
import { createExtendedProblemDetails } from '@batkit/rfc9457';

/**
 * Base class for all application errors.
 * Extends native Error with HTTP status code and RFC 9457 Problem Details support.
 */
export class AppError extends Error {
  /**
   * HTTP status code for this error
   */
  public readonly statusCode: number;

  /**
   * Machine-readable error code
   */
  public readonly code: string;

  /**
   * Additional structured details about the error
   */
  public readonly details?: Record<string, unknown>;

  /**
   * Whether this is an operational error (expected) vs programmer error (bug)
   */
  public readonly isOperational: boolean;

  /**
   * Timestamp when the error occurred
   */
  public readonly timestamp: Date;

  constructor(
    statusCode: number,
    message: string,
    code?: string,
    details?: Record<string, unknown>,
    isOperational = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code || this.constructor.name.replace(/Error$/, '').toUpperCase();
    this.details = details;
    this.isOperational = isOperational;
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown (only available in V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Converts the error to an RFC 9457 Problem Details object
   */
  toRFC9457(): ExtendedProblemDetails {
    const problemDetails: ExtendedProblemDetails = createExtendedProblemDetails({
      type: `error:${this.code.toLowerCase()}`,
      title: this.name,
      status: this.statusCode,
      detail: this.message,
      ...this.details,
    });

    return problemDetails;
  }

  /**
   * Returns a JSON representation of the error
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      ...(process.env['NODE_ENV'] !== 'production' && { stack: this.stack }),
    };
  }
}

/**
 * 400 Bad Request - The request was malformed or invalid
 */
export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', details?: Record<string, unknown>) {
    super(400, message, 'BAD_REQUEST', details);
  }
}

/**
 * 400 Bad Request - Validation failed
 * Requires validation error details
 */
export class ValidationError extends AppError {
  public readonly validationErrors: Array<{
    field: string;
    message: string;
    value?: unknown;
  }>;

  constructor(
    message: string,
    validationErrors: Array<{ field: string; message: string; value?: unknown }>
  ) {
    super(400, message, 'VALIDATION_ERROR', { validationErrors });
    this.validationErrors = validationErrors;
  }

  override toRFC9457(): ExtendedProblemDetails {
    return createExtendedProblemDetails({
      type: 'error:validation',
      title: 'Validation Error',
      status: 400,
      detail: this.message,
      validationErrors: this.validationErrors,
    });
  }
}

/**
 * 401 Unauthorized - Authentication is required or failed
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details?: Record<string, unknown>) {
    super(401, message, 'UNAUTHORIZED', details);
  }
}

/**
 * 403 Forbidden - The client does not have permission
 */
export class ForbiddenError extends AppError {
  public readonly resource?: string;
  public readonly action?: string;

  constructor(message = 'Forbidden', resource?: string, action?: string) {
    super(403, message, 'FORBIDDEN', { resource, action });
    this.resource = resource;
    this.action = action;
  }
}

/**
 * 404 Not Found - The requested resource was not found
 * Requires entity name and ID to help with troubleshooting
 */
export class NotFoundError extends AppError {
  public readonly entityName: string;
  public readonly entityId: string | number;

  constructor(entityName: string, entityId: string | number) {
    const message = `${entityName} with id '${entityId}' was not found`;
    super(404, message, 'NOT_FOUND', { entityName, entityId });
    this.entityName = entityName;
    this.entityId = entityId;
  }

  override toRFC9457(): ExtendedProblemDetails {
    return createExtendedProblemDetails({
      type: 'error:not-found',
      title: 'Resource Not Found',
      status: 404,
      detail: this.message,
      entityName: this.entityName,
      entityId: this.entityId,
    });
  }
}

/**
 * 409 Conflict - The request conflicts with the current state
 */
export class ConflictError extends AppError {
  public readonly conflictingResource?: string;
  public readonly conflictingId?: string | number;

  constructor(message: string, conflictingResource?: string, conflictingId?: string | number) {
    super(409, message, 'CONFLICT', { conflictingResource, conflictingId });
    this.conflictingResource = conflictingResource;
    this.conflictingId = conflictingId;
  }
}

/**
 * 422 Unprocessable Entity - The request was well-formed but semantically invalid
 */
export class UnprocessableEntityError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(422, message, 'UNPROCESSABLE_ENTITY', details);
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class TooManyRequestsError extends AppError {
  public readonly retryAfter?: number;
  public readonly limit?: number;

  constructor(message = 'Too Many Requests', retryAfter?: number, limit?: number) {
    super(429, message, 'TOO_MANY_REQUESTS', { retryAfter, limit });
    this.retryAfter = retryAfter;
    this.limit = limit;
  }

  override toRFC9457(): ExtendedProblemDetails {
    return createExtendedProblemDetails({
      type: 'error:too-many-requests',
      title: 'Too Many Requests',
      status: 429,
      detail: this.message,
      ...(this.retryAfter && { retryAfter: this.retryAfter }),
      ...(this.limit && { limit: this.limit }),
    });
  }
}

/**
 * 500 Internal Server Error - An unexpected error occurred
 */
export class InternalServerError extends AppError {
  constructor(message = 'Internal Server Error', details?: Record<string, unknown>) {
    super(500, message, 'INTERNAL_SERVER_ERROR', details);
  }
}

/**
 * 501 Not Implemented - The functionality is not implemented yet
 */
export class NotImplementedError extends AppError {
  constructor(message = 'Not Implemented', feature?: string) {
    super(501, message, 'NOT_IMPLEMENTED', { feature });
  }
}

/**
 * 502 Bad Gateway - Invalid response from upstream server
 */
export class BadGatewayError extends AppError {
  constructor(message = 'Bad Gateway', upstream?: string) {
    super(502, message, 'BAD_GATEWAY', { upstream });
  }
}

/**
 * 503 Service Unavailable - The service is temporarily unavailable
 */
export class ServiceUnavailableError extends AppError {
  public readonly retryAfter?: number;

  constructor(message = 'Service Unavailable', retryAfter?: number) {
    super(503, message, 'SERVICE_UNAVAILABLE', { retryAfter });
    this.retryAfter = retryAfter;
  }

  override toRFC9457(): ExtendedProblemDetails {
    return createExtendedProblemDetails({
      type: 'error:service-unavailable',
      title: 'Service Unavailable',
      status: 503,
      detail: this.message,
      ...(this.retryAfter && { retryAfter: this.retryAfter }),
    });
  }
}

/**
 * 504 Gateway Timeout - Upstream server did not respond in time
 */
export class GatewayTimeoutError extends AppError {
  constructor(message = 'Gateway Timeout', upstream?: string, timeout?: number) {
    super(504, message, 'GATEWAY_TIMEOUT', { upstream, timeout });
  }
}

/**
 * Type guard to check if a value is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if an error is operational (expected) vs programmer error
 */
export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}

/**
 * Type guard for ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Type guard for NotFoundError
 */
export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

/**
 * Type guard for UnauthorizedError
 */
export function isUnauthorizedError(error: unknown): error is UnauthorizedError {
  return error instanceof UnauthorizedError;
}

/**
 * Type guard for ForbiddenError
 */
export function isForbiddenError(error: unknown): error is ForbiddenError {
  return error instanceof ForbiddenError;
}

/**
 * Extracts HTTP status code from an error, defaults to 500
 */
export function getStatusCode(error: unknown): number {
  if (isAppError(error)) {
    return error.statusCode;
  }
  return 500;
}

/**
 * Extracts error code from an error
 */
export function getErrorCode(error: unknown): string {
  if (isAppError(error)) {
    return error.code;
  }
  if (error instanceof Error) {
    return 'UNKNOWN_ERROR';
  }
  return 'UNKNOWN';
}
