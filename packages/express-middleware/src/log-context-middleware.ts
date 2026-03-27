import type { LogValue } from '@batkit/logger';
import { runWithContext } from '@batkit/logger/async-local';
import type { NextFunction, Request, Response } from 'express';

export type LogContextInitializer = (req: Request) => Record<string, LogValue>;

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
 * depending on Express (`req`) deep in the stack.
 *
 * Mount this **early** in the middleware chain. Use synchronous `next()` inside
 * the callback; avoid `async` middleware that calls `next` after an `await`
 * without keeping the rest of the work in the same async context.
 */
export function logContextMiddleware(
  options: LogContextMiddlewareOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const initialContext = options.initialContext ?? (() => ({}));

  return (req: Request, _res: Response, next: NextFunction) => {
    runWithContext(initialContext(req), () => next());
  };
}
