import { AsyncLocalStorage } from 'node:async_hooks';
import type { LogLevel, LogMethod, LogValue, Logger, LoggerProvider } from './types.js';

const logContextStorage = new AsyncLocalStorage<Record<string, LogValue>>();

function overlay(explicit?: Record<string, LogValue>): Record<string, LogValue> | undefined {
  const als = logContextStorage.getStore();
  if (als === undefined && explicit === undefined) {
    return undefined;
  }
  if (explicit === undefined) {
    return als ? { ...als } : undefined;
  }
  if (als === undefined) {
    return explicit;
  }
  return { ...als, ...explicit };
}

function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Run `fn` with async-local log context. The returned store object is mutable;
 * {@link mergeLogContext} merges fields into it for the rest of this async chain.
 *
 * If there is already a store (nested call), {@link initial} is merged on top so outer
 * fields (e.g. `correlationId`) remain unless {@link initial} overrides the same key.
 */
export function runWithLogContext<T>(initial: Record<string, LogValue>, fn: () => T): T {
  const parent = logContextStorage.getStore();
  const store: Record<string, LogValue> = parent ? { ...parent, ...initial } : { ...initial };
  return logContextStorage.run(store, fn);
}

/**
 * Current async-local log fields, or `undefined` if not inside {@link runWithLogContext}.
 */
export function getLogContext(): Record<string, LogValue> | undefined {
  const store = logContextStorage.getStore();
  return store === undefined ? undefined : { ...store };
}

/**
 * Merge fields into the current async-local log context (same object seen by later
 * {@link getLogContext} and {@link ContextualLoggerProvider}).
 *
 * @throws if called outside {@link runWithLogContext}
 */
export function mergeLogContext(partial: Record<string, LogValue>): void {
  const store = logContextStorage.getStore();
  if (store === undefined) {
    throw new Error(
      'mergeLogContext() was called with no async log context; wrap the scope with runWithLogContext() (e.g. request middleware).'
    );
  }
  Object.assign(store, partial);
}

function wrapLogMethod(inner: LogMethod): LogMethod {
  const wrapped = ((a?: unknown, b?: unknown, c?: unknown) => {
    if (isError(a)) {
      if (typeof b === 'string') {
        inner(a, b, overlay(c as Record<string, LogValue> | undefined));
        return;
      }
      inner(a, overlay(b as Record<string, LogValue> | undefined));
      return;
    }

    if (typeof a === 'string') {
      inner(a, overlay(b as Record<string, LogValue> | undefined));
      return;
    }

    if (a !== null && typeof a === 'object' && !Array.isArray(a)) {
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
    };
  }

  isLogLevelEnabled(level: LogLevel): boolean {
    return this.inner.isLogLevelEnabled(level);
  }
}
