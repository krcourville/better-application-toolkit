import { AsyncLocalStorage } from 'node:async_hooks';
import type { LogValue } from './types.js';

const logContextStorage = new AsyncLocalStorage<Record<string, LogValue>>();

/** Used by {@link ContextualLoggerProvider} to merge ALS fields into log calls. */
export function overlay(explicit?: Record<string, LogValue>): Record<string, LogValue> | undefined {
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

/**
 * Run `fn` with async-local log context. The returned store object is mutable;
 * {@link mergeLogContext} merges fields into it for the rest of this async chain.
 *
 * If there is already a store (nested call), `initial` is merged on top so outer
 * fields (e.g. `correlationId`) remain unless inner `initial` overrides the same key.
 */
export function runWithContext<T>(initial: Record<string, LogValue>, fn: () => T): T {
  const parent = logContextStorage.getStore();
  const store: Record<string, LogValue> = parent ? { ...parent, ...initial } : { ...initial };
  return logContextStorage.run(store, fn);
}

/**
 * Current async-local log fields, or `undefined` if not inside {@link runWithContext}.
 */
export function getLogContext(): Record<string, LogValue> | undefined {
  const store = logContextStorage.getStore();
  return store === undefined ? undefined : { ...store };
}

/**
 * Merge fields into the current async-local log context (same object seen by later
 * {@link getLogContext} and {@link ContextualLoggerProvider}).
 *
 * @throws if called outside {@link runWithContext}
 */
export function mergeLogContext(partial: Record<string, LogValue>): void {
  const store = logContextStorage.getStore();
  if (store === undefined) {
    throw new Error(
      'mergeLogContext() was called with no async log context; wrap the scope with runWithContext() (e.g. request middleware).'
    );
  }
  Object.assign(store, partial);
}
