/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Numeric values for log levels (for filtering)
 */
export const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 10,
  [LogLevel.INFO]: 20,
  [LogLevel.WARN]: 30,
  [LogLevel.ERROR]: 40,
};

/**
 * Context that can be attached to a logger
 */
export interface LoggerContext {
  [key: string]: unknown;
}

/**
 * Core logger interface that all implementations must satisfy
 */
export interface Logger {
  /**
   * Log a debug message
   * @param message - The log message
   * @param args - Additional structured data
   */
  debug(message: string, ...args: unknown[]): void;

  /**
   * Log an info message
   * @param message - The log message
   * @param args - Additional structured data
   */
  info(message: string, ...args: unknown[]): void;

  /**
   * Log a warning message
   * @param message - The log message
   * @param args - Additional structured data
   */
  warn(message: string, ...args: unknown[]): void;

  /**
   * Log an error message
   * @param message - The log message
   * @param args - Additional structured data (may include Error objects)
   */
  error(message: string, ...args: unknown[]): void;

  /**
   * Create a child logger with additional context
   * @param context - Context to merge with parent context
   * @returns A new logger instance with merged context
   */
  child(context: LoggerContext): Logger;
}

/**
 * Factory interface for creating logger instances
 */
export interface LoggerFactory {
  /**
   * Create a new logger instance
   * @param context - Optional initial context
   * @returns A logger instance
   */
  createLogger(context?: LoggerContext): Logger;
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
  context?: LoggerContext;

  /**
   * Whether to pretty-print logs (vs structured JSON)
   */
  pretty?: boolean;
}
