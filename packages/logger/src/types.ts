/**
 * Log levels
 */
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

/**
 * Type-safe log values (only serializable types)
 */
export type LogValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | { [key: string]: LogValue }
  | LogValue[];

/**
 * Opinionated log method signature that enforces consistent error logging
 * Compatible with pino's LogFn so drivers can be swapped easily
 *
 * @example
 * // Context only
 * logger.info({ userId: '123' })
 *
 * // Message + context
 * logger.info("User created", { userId: '123' })
 *
 * // Error + context
 * logger.error(new Error("DB failed"), { retries: 3 })
 *
 * // Error + message + context
 * logger.error(new Error("DB failed"), "Failed to fetch user", { userId: '123' })
 */
export interface LogMethod {
  (context: Record<string, LogValue>): void;
  (msg: string, context?: Record<string, LogValue>): void;
  (error: Error, context?: Record<string, LogValue>): void;
  (error: Error, msg?: string, context?: Record<string, LogValue>): void;
}

/**
 * Core logger interface - opinionated and simple
 * All implementations must satisfy these signatures
 */
export interface Logger {
  debug: LogMethod;
  info: LogMethod;
  warn: LogMethod;
  error: LogMethod;

  /**
   * Merge fields into async-local log context for the current scope (same effect as
   * `mergeLogContext` from `@batkit/logger/async-local`). Requires `runWithContext`
   * (e.g. request middleware) and a provider that supports ALS (e.g. wrapped with
   * `ContextualLoggerProvider`). Default console loggers throw with setup instructions.
   */
  mergeContext(partial: Record<string, LogValue>): void;

  /**
   * Run `fn` with merged async-local log context (same as `runWithContext` from
   * `@batkit/logger/async-local`). Prefer this on the logger when you already have a
   * logger reference and want to avoid a separate import.
   */
  runWithContext<T>(initial: Record<string, LogValue>, fn: () => T): T;
}

/**
 * Logger provider that creates named logger instances
 */
export interface LoggerProvider {
  /**
   * Get a logger for a given name
   * @param name - Logger name (e.g., 'database', 'auth', 'api')
   * @returns Logger instance
   */
  getLogger(name: string): Logger;

  /**
   * Check if a log level is enabled
   * @param level - Log level to check
   * @returns true if the level would be logged
   */
  isLogLevelEnabled(level: LogLevel): boolean;
}

/**
 * Configuration options for logger implementations
 */
export interface LoggerOptions {
  /**
   * Minimum log level to output
   */
  level?: LogLevel;

  /**
   * Base context to include in all logs
   */
  context?: Record<string, LogValue>;

  /**
   * Whether to pretty-print logs (vs structured JSON)
   */
  pretty?: boolean;
}
