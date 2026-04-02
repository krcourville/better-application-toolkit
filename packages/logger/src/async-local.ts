import { mergeLogContext, overlay, runWithContext } from "./log-context.js";
import type { LogLevel, LogMethod, LogValue, Logger, LoggerProvider } from "./types.js";

export { getLogContext, mergeLogContext, runWithContext } from "./log-context.js";

function isError(value: unknown): value is Error {
  return value instanceof Error;
}

function wrapLogMethod(inner: LogMethod): LogMethod {
  const wrapped = ((a?: unknown, b?: unknown, c?: unknown) => {
    if (isError(a)) {
      if (typeof b === "string") {
        inner(a, b, overlay(c as Record<string, LogValue> | undefined));
        return;
      }
      inner(a, overlay(b as Record<string, LogValue> | undefined));
      return;
    }

    if (typeof a === "string") {
      inner(a, overlay(b as Record<string, LogValue> | undefined));
      return;
    }

    if (a !== null && typeof a === "object" && !Array.isArray(a)) {
      const base = a as Record<string, LogValue>;
      const merged = overlay(base);
      inner(merged ?? {});
      return;
    }

    inner(a as never);
  }) as LogMethod;
  return wrapped;
}

/**
 * Wraps a {@link LoggerProvider} so every log merges {@link getLogContext} into
 * explicit call arguments (call-site keys win on conflict).
 */
export class ContextualLoggerProvider implements LoggerProvider {
  constructor(private readonly inner: LoggerProvider) {}

  getLogger(name: string): Logger {
    const base = this.inner.getLogger(name);
    return {
      debug: wrapLogMethod(base.debug.bind(base)),
      info: wrapLogMethod(base.info.bind(base)),
      warn: wrapLogMethod(base.warn.bind(base)),
      error: wrapLogMethod(base.error.bind(base)),
      mergeContext: mergeLogContext,
      runWithContext,
    };
  }

  isLogLevelEnabled(level: LogLevel): boolean {
    return this.inner.isLogLevelEnabled(level);
  }
}
