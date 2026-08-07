import type { Context } from "hono";

const HttpStatus = {
  UNPROCESSABLE_ENTITY: 422,
} as const;

interface ValidationResult {
  success: boolean;
  error?: { issues: { code: string; path: (string | number)[]; message: string }[] };
}

/**
 * `@hono/zod-openapi`'s `defaultHook`: converts a failed request-schema parse
 * into an RFC 9457 problem-details response. Every `OpenAPIHono` instance
 * (top-level and per-route-group) needs this passed to its constructor —
 * `defaultHook` does not propagate through `app.route()`.
 */
export function validationHook(result: ValidationResult, ctx: Context) {
  if (!result.success && result.error) {
    const validationErrors = result.error.issues.map((issue) => ({
      code: issue.code,
      field: issue.path.join(".") || "root",
      message: issue.message,
    }));

    return ctx.json(
      {
        detail: "Request validation failed",
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        title: "Validation Error",
        type: "error:validation",
        validationErrors,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
  // oxlint-disable-next-line no-useless-return, no-useless-undefined -- noImplicitReturns requires an explicit return on every path.
  return undefined;
}
