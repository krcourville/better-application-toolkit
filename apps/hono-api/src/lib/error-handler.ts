import { isAppError } from "@batkit/errors";
import { LoggerFacade } from "@batkit/logger";
import {
  type ExtendedProblemDetails,
  PROBLEM_DETAILS_CONTENT_TYPE,
  createExtendedProblemDetails,
} from "@batkit/rfc9457";
import type { Context } from "hono";
// `Context<any>` matches Hono's `NotFoundHandler`/`ErrorHandler` for any `Env`
// Generic app.notFound()/app.onError() is registered on.
type AnyContext = Context<any>;
import type { ContentfulStatusCode } from "hono/utils/http-status";

const logger = LoggerFacade.getLogger("error-handler");

const HttpStatus = {
  INTERNAL_SERVER_ERROR: 500,
  NOT_FOUND: 404,
  UNPROCESSABLE_ENTITY: 422,
} as const;

function isZodError(
  error: unknown,
): error is { issues: { code: string; path: unknown[]; message: string }[] } {
  return (
    typeof error === "object" &&
    error !== null &&
    "issues" in error &&
    Array.isArray((error as Record<string, unknown>).issues)
  );
}

function formatZodError(error: {
  issues: { code: string; path: unknown[]; message: string }[];
}): ExtendedProblemDetails {
  const validationErrors = error.issues.map((issue) => ({
    code: issue.code,
    field: issue.path.join("."),
    message: issue.message,
  }));

  return createExtendedProblemDetails({
    detail: "Request validation failed",
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    title: "Validation Error",
    type: "error:validation",
    validationErrors,
  });
}

function formatError(error: unknown): ExtendedProblemDetails {
  if (isAppError(error)) {
    return error.toRFC9457();
  }

  if (isZodError(error)) {
    return formatZodError(error);
  }

  if (error instanceof Error) {
    return createExtendedProblemDetails({
      detail: error.message,
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      title: "Internal Server Error",
      type: "error:internal",
    });
  }

  return createExtendedProblemDetails({
    detail: "An unknown error occurred",
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    title: "Unknown Error",
    type: "error:unknown",
  });
}

function logHandledError(error: Error, ctx: AnyContext): void {
  if (isAppError(error) && error.isOperational) {
    logger.warn("Operational error occurred", {
      code: error.code,
      error: error.message,
      method: ctx.req.method,
      path: ctx.req.path,
      statusCode: error.statusCode,
    });
    return;
  }

  logger.error(error, {
    method: ctx.req.method,
    path: ctx.req.path,
    query: ctx.req.query(),
  });
}

/**
 * Hono `onError` hook that converts thrown errors (and zod validation errors
 * surfaced via `defaultHook`) into RFC 9457 problem-details responses.
 *
 * @example
 * ```ts
 * import { errorHandler, notFoundHandler } from "./lib/error-handler.js";
 *
 * const app = new OpenAPIHono();
 * app.onError(errorHandler);
 * app.notFound(notFoundHandler);
 * ```
 */
export function errorHandler(error: Error, ctx: AnyContext): Response {
  logHandledError(error, ctx);

  const problemDetails = formatError(error);
  problemDetails.stack = error.stack?.split("\n").map((line) => line.trim());
  problemDetails.instance ??= ctx.req.path;

  const status = (problemDetails.status ??
    HttpStatus.INTERNAL_SERVER_ERROR) as ContentfulStatusCode;
  return ctx.body(JSON.stringify(problemDetails), status, {
    "Content-Type": PROBLEM_DETAILS_CONTENT_TYPE,
  });
}

export function notFoundHandler(ctx: AnyContext): Response {
  const problemDetails = createExtendedProblemDetails({
    detail: `The route ${ctx.req.method} ${ctx.req.path} does not exist`,
    instance: ctx.req.path,
    status: HttpStatus.NOT_FOUND,
    title: "Route Not Found",
    type: "error:not-found",
  });

  return ctx.body(JSON.stringify(problemDetails), HttpStatus.NOT_FOUND, {
    "Content-Type": PROBLEM_DETAILS_CONTENT_TYPE,
  });
}
