import {
  LOG_LEVEL_VALUES,
  LogLevel,
  type Logger,
  type LoggerContext,
  type LoggerFactory,
  type LoggerOptions,
} from './types.js';

/**
 * Console-based logger implementation that works in both Node.js and browser
 */
export class ConsoleLogger implements Logger {
  private readonly level: LogLevel;
  private readonly context: LoggerContext;
  private readonly pretty: boolean;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level || LogLevel.INFO;
    this.context = options.context || {};
    this.pretty = options.pretty ?? true;
  }

  debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  child(context: LoggerContext): Logger {
    return new ConsoleLogger({
      level: this.level,
      context: { ...this.context, ...context },
      pretty: this.pretty,
    });
  }

  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    // Check if this level should be logged
    if (LOG_LEVEL_VALUES[level] < LOG_LEVEL_VALUES[this.level]) {
      return;
    }

    const logData = this.formatLogData(level, message, args);

    // Use appropriate console method
    const consoleMethod = this.getConsoleMethod(level);

    if (this.pretty) {
      consoleMethod(this.formatPretty(level, message, logData));
    } else {
      consoleMethod(JSON.stringify(logData));
    }
  }

  private formatLogData(
    level: LogLevel,
    message: string,
    args: unknown[]
  ): Record<string, unknown> {
    const data: Record<string, unknown> = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...this.context,
    };

    // Merge additional arguments
    for (const arg of args) {
      if (arg instanceof Error) {
        // @ts-expect-error TS4111 - index signature property access
        data.error = {
          name: arg.name,
          message: arg.message,
          stack: arg.stack,
        };
      } else if (typeof arg === 'object' && arg !== null) {
        Object.assign(data, arg);
      } else if (arg !== undefined) {
        // @ts-expect-error TS4111 - index signature property access
        data.data = arg;
      }
    }

    return data;
  }

  private formatPretty(level: LogLevel, message: string, logData: Record<string, unknown>): string {
    // @ts-expect-error TS4111 - index signature property access
    const timestamp = logData.timestamp as string;
    const levelStr = level.toUpperCase().padEnd(5);

    // Remove fields we're handling separately
    const { level: _, message: __, timestamp: ___, ...rest } = logData;

    const contextStr = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : '';

    return `${timestamp} [${levelStr}] ${message}${contextStr}`;
  }

  private getConsoleMethod(level: LogLevel): (...args: unknown[]) => void {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug.bind(console);
      case LogLevel.INFO:
        return console.info.bind(console);
      case LogLevel.WARN:
        return console.warn.bind(console);
      case LogLevel.ERROR:
        return console.error.bind(console);
    }
  }
}

/**
 * Factory for creating console logger instances
 */
export class ConsoleLoggerFactory implements LoggerFactory {
  private readonly defaultOptions: LoggerOptions;

  constructor(defaultOptions: LoggerOptions = {}) {
    this.defaultOptions = defaultOptions;
  }

  createLogger(context?: LoggerContext): Logger {
    return new ConsoleLogger({
      ...this.defaultOptions,
      context: {
        ...this.defaultOptions.context,
        ...context,
      },
    });
  }
}

/**
 * Helper function to create a console logger with options
 * @param options - Logger configuration options
 * @returns A console logger instance
 */
export function createConsoleLogger(options?: LoggerOptions): Logger {
  return new ConsoleLogger(options);
}
