import type { LogValue } from "@batkit/logger";
import { runWithContext } from "@batkit/logger/async-local";
import type { Context, Next } from "hono";

export type LogContextInitializer = (ctx: Context) => Record<string, LogValue>;

export interface LogContextMiddlewareOptions {
  /**
   * Build initial async-local log fields for this HTTP request.
   * @default () => ({})
   */
  initialContext?: LogContextInitializer;
}

/**
 * Runs each request inside {@link runWithContext} so later code can use
 * {@link mergeLogContext} and a {@link ContextualLoggerProvider} without
 * threading Hono's `Context` deep in the stack.
 *
 * Mount this **early** in the middleware chain (`app.use("*", ...)`).
 */
export function logContextMiddleware(options: LogContextMiddlewareOptions = {}) {
  const initialContext = options.initialContext ?? (() => ({}));

  return (ctx: Context, next: Next) => runWithContext(initialContext(ctx), () => next());
}
