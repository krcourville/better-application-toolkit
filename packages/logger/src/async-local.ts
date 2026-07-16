import { mergeLogContext, overlay, runWithContext } from "./log-context.js";
import type { LogLevel, LogMethod, LogValue, Logger, LoggerProvider } from "./types.js";

export { getLogContext, mergeLogContext, runWithContext } from "./log-context.js";

function isError(value: unknown): value is Error {
  return value instanceof Error;
}

function wrapLogMethod(inner: LogMethod): LogMethod {
  const wrapped = ((first?: unknown, second?: unknown, third?: unknown) => {
    if (isError(first)) {
      if (typeof second === "string") {
        inner(first, second, overlay(third as Record<string, LogValue> | undefined));
        return;
      }
      inner(first, overlay(second as Record<string, LogValue> | undefined));
      return;
    }

    if (typeof first === "string") {
      inner(first, overlay(second as Record<string, LogValue> | undefined));
      return;
    }

    if (first !== null && typeof first === "object" && !Array.isArray(first)) {
      const base = first as Record<string, LogValue>;
      const merged = overlay(base);
      inner(merged ?? {});
      return;
    }

    inner(first as never);
  }) as LogMethod;
  return wrapped;
}

/**
 * Wraps a {@link LoggerProvider} so every log merges {@link getLogContext} into
 * explicit call arguments (call-site keys win on conflict).
 */
export class ContextualLoggerProvider implements LoggerProvider {
  private readonly inner: LoggerProvider;

  constructor(inner: LoggerProvider) {
    this.inner = inner;
  }

  getLogger(name: string): Logger {
    const base = this.inner.getLogger(name);
    return {
      debug: wrapLogMethod(base.debug.bind(base)),
      error: wrapLogMethod(base.error.bind(base)),
      info: wrapLogMethod(base.info.bind(base)),
      mergeContext: mergeLogContext,
      runWithContext,
      warn: wrapLogMethod(base.warn.bind(base)),
    };
  }

  isLogLevelEnabled(level: LogLevel): boolean {
    return this.inner.isLogLevelEnabled(level);
  }
}
