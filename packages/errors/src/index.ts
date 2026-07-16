import { type ExtendedProblemDetails, createExtendedProblemDetails } from "@batkit/rfc9457";

const HttpStatus = {
  BAD_GATEWAY: 502,
  BAD_REQUEST: 400,
  CONFLICT: 409,
  FORBIDDEN: 403,
  GATEWAY_TIMEOUT: 504,
  INTERNAL_SERVER_ERROR: 500,
  NOT_FOUND: 404,
  NOT_IMPLEMENTED: 501,
  SERVICE_UNAVAILABLE: 503,
  TOO_MANY_REQUESTS: 429,
  UNAUTHORIZED: 401,
  UNPROCESSABLE_ENTITY: 422,
} as const;

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
    options: { code?: string; details?: Record<string, unknown>; isOperational?: boolean } = {},
  ) {
    super(message);
    const { code, details, isOperational = true } = options;
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code || this.constructor.name.replace(/Error$/u, "").toUpperCase();
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
      detail: this.message,
      status: this.statusCode,
      title: this.name,
      type: `error:${this.code.toLowerCase()}`,
      ...this.details,
    });

    return problemDetails;
  }

  /**
   * Returns a JSON representation of the error
   */
  toJSON(): Record<string, unknown> {
    return {
      code: this.code,
      details: this.details,
      message: this.message,
      name: this.name,
      stack: this.stack,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

/**
 * 400 Bad Request - The request was malformed or invalid
 */
export class BadRequestError extends AppError {
  constructor(message = "Bad Request", details?: Record<string, unknown>) {
    super(HttpStatus.BAD_REQUEST, message, { code: "BAD_REQUEST", details });
  }
}

/**
 * 400 Bad Request - Validation failed
 * Requires validation error details
 */
export class ValidationError extends AppError {
  public readonly validationErrors: {
    field: string;
    message: string;
    value?: unknown;
  }[];

  constructor(
    message: string,
    validationErrors: { field: string; message: string; value?: unknown }[],
  ) {
    super(HttpStatus.UNPROCESSABLE_ENTITY, message, {
      code: "VALIDATION_ERROR",
      details: { validationErrors },
    });
    this.validationErrors = validationErrors;
  }

  override toRFC9457(): ExtendedProblemDetails {
    return createExtendedProblemDetails({
      detail: this.message,
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      title: "Validation Error",
      type: "error:validation",
      validationErrors: this.validationErrors,
    });
  }
}

/**
 * 401 Unauthorized - Authentication is required or failed
 */
export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", details?: Record<string, unknown>) {
    super(HttpStatus.UNAUTHORIZED, message, { code: "UNAUTHORIZED", details });
  }
}

/**
 * 403 Forbidden - The client does not have permission
 */
export class ForbiddenError extends AppError {
  public readonly resource?: string;
  public readonly action?: string;

  constructor(message = "Forbidden", resource?: string, action?: string) {
    super(HttpStatus.FORBIDDEN, message, { code: "FORBIDDEN", details: { action, resource } });
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
    super(HttpStatus.NOT_FOUND, message, { code: "NOT_FOUND", details: { entityId, entityName } });
    this.entityName = entityName;
    this.entityId = entityId;
  }

  override toRFC9457(): ExtendedProblemDetails {
    return createExtendedProblemDetails({
      detail: this.message,
      entityId: this.entityId,
      entityName: this.entityName,
      status: HttpStatus.NOT_FOUND,
      title: "Resource Not Found",
      type: "error:not-found",
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
    super(HttpStatus.CONFLICT, message, {
      code: "CONFLICT",
      details: { conflictingId, conflictingResource },
    });
    this.conflictingResource = conflictingResource;
    this.conflictingId = conflictingId;
  }
}

/**
 * 422 Unprocessable Entity - The request was well-formed but semantically invalid
 */
export class UnprocessableEntityError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(HttpStatus.UNPROCESSABLE_ENTITY, message, { code: "UNPROCESSABLE_ENTITY", details });
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class TooManyRequestsError extends AppError {
  public readonly retryAfter?: number;
  public readonly limit?: number;

  constructor(message = "Too Many Requests", retryAfter?: number, limit?: number) {
    super(HttpStatus.TOO_MANY_REQUESTS, message, {
      code: "TOO_MANY_REQUESTS",
      details: { limit, retryAfter },
    });
    this.retryAfter = retryAfter;
    this.limit = limit;
  }

  override toRFC9457(): ExtendedProblemDetails {
    return createExtendedProblemDetails({
      detail: this.message,
      status: HttpStatus.TOO_MANY_REQUESTS,
      title: "Too Many Requests",
      type: "error:too-many-requests",
      ...(this.retryAfter && { retryAfter: this.retryAfter }),
      ...(this.limit && { limit: this.limit }),
    });
  }
}

/**
 * 500 Internal Server Error - An unexpected error occurred
 */
export class InternalServerError extends AppError {
  constructor(message = "Internal Server Error", details?: Record<string, unknown>) {
    super(HttpStatus.INTERNAL_SERVER_ERROR, message, { code: "INTERNAL_SERVER_ERROR", details });
  }
}

/**
 * 501 Not Implemented - The functionality is not implemented yet
 */
export class NotImplementedError extends AppError {
  constructor(message = "Not Implemented", feature?: string) {
    super(HttpStatus.NOT_IMPLEMENTED, message, { code: "NOT_IMPLEMENTED", details: { feature } });
  }
}

/**
 * 502 Bad Gateway - Invalid response from upstream server
 */
export class BadGatewayError extends AppError {
  constructor(message = "Bad Gateway", upstream?: string) {
    super(HttpStatus.BAD_GATEWAY, message, { code: "BAD_GATEWAY", details: { upstream } });
  }
}

/**
 * 503 Service Unavailable - The service is temporarily unavailable
 */
export class ServiceUnavailableError extends AppError {
  public readonly retryAfter?: number;

  constructor(message = "Service Unavailable", retryAfter?: number) {
    super(HttpStatus.SERVICE_UNAVAILABLE, message, {
      code: "SERVICE_UNAVAILABLE",
      details: { retryAfter },
    });
    this.retryAfter = retryAfter;
  }

  override toRFC9457(): ExtendedProblemDetails {
    return createExtendedProblemDetails({
      detail: this.message,
      status: HttpStatus.SERVICE_UNAVAILABLE,
      title: "Service Unavailable",
      type: "error:service-unavailable",
      ...(this.retryAfter && { retryAfter: this.retryAfter }),
    });
  }
}

/**
 * 504 Gateway Timeout - Upstream server did not respond in time
 */
export class GatewayTimeoutError extends AppError {
  constructor(message = "Gateway Timeout", upstream?: string, timeout?: number) {
    super(HttpStatus.GATEWAY_TIMEOUT, message, {
      code: "GATEWAY_TIMEOUT",
      details: { timeout, upstream },
    });
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
  return HttpStatus.INTERNAL_SERVER_ERROR;
}

/**
 * Extracts error code from an error
 */
export function getErrorCode(error: unknown): string {
  if (isAppError(error)) {
    return error.code;
  }
  if (error instanceof Error) {
    return "UNKNOWN_ERROR";
  }
  return "UNKNOWN";
}
