import type { Logger, LoggerContext, LoggerFactory } from '@batkit/logger';
import { LogLevel } from '@batkit/logger';
import pino, { type Logger as PinoLogger, type LoggerOptions as PinoOptions } from 'pino';

/**
 * Configuration options for Pino logger
 */
export interface PinoLoggerOptions {
  /**
   * Minimum log level
   */
  level?: LogLevel | string;

  /**
   * Base context for all logs
   */
  context?: LoggerContext;

  /**
   * Pino transport configuration
   */
  transport?: PinoOptions['transport'];

  /**
   * Paths to redact in logs (for sensitive data)
   */
  redact?: string[];

  /**
   * Additional Pino options
   */
  pinoOptions?: Omit<PinoOptions, 'level' | 'transport'>;
}

/**
 * Maps LogLevel to Pino log levels
 */
function mapLogLevel(level: LogLevel | string): pino.LevelWithSilent {
  const levelMap: Record<LogLevel, pino.LevelWithSilent> = {
    [LogLevel.DEBUG]: 'debug',
    [LogLevel.INFO]: 'info',
    [LogLevel.WARN]: 'warn',
    [LogLevel.ERROR]: 'error',
  };

  return levelMap[level as LogLevel] || (level as pino.LevelWithSilent);
}

/**
 * Pino-based logger implementation of the Logger interface
 */
export class PinoLoggerAdapter implements Logger {
  constructor(private readonly pino: PinoLogger) {}

  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log('error', message, ...args);
  }

  child(context: LoggerContext): Logger {
    return new PinoLoggerAdapter(this.pino.child(context));
  }

  private log(level: string, message: string, ...args: unknown[]): void {
    const logFn = this.pino[level as keyof PinoLogger] as (obj: unknown, msg: string) => void;

    // Merge all object arguments
    const mergedData: Record<string, unknown> = {};
    let error: Error | undefined;

    for (const arg of args) {
      if (arg instanceof Error) {
        error = arg;
      } else if (typeof arg === 'object' && arg !== null) {
        Object.assign(mergedData, arg);
      }
    }

    // Log with merged data or error
    if (error) {
      logFn.call(this.pino, { ...mergedData, err: error }, message);
    } else if (Object.keys(mergedData).length > 0) {
      logFn.call(this.pino, mergedData, message);
    } else {
      logFn.call(this.pino, {}, message);
    }
  }
}

/**
 * Factory for creating Pino logger instances
 */
export class PinoLoggerFactory implements LoggerFactory {
  private readonly basePino: PinoLogger;

  constructor(options: PinoLoggerOptions = {}) {
    const pinoOptions: PinoOptions = {
      level: options.level ? mapLogLevel(options.level) : 'info',
      ...options.pinoOptions,
    };

    if (options.transport) {
      pinoOptions.transport = options.transport;
    }

    if (options.redact) {
      pinoOptions.redact = options.redact;
    }

    this.basePino = options.context ? pino(pinoOptions).child(options.context) : pino(pinoOptions);
  }

  createLogger(context?: LoggerContext): Logger {
    const pinoInstance = context ? this.basePino.child(context) : this.basePino;
    return new PinoLoggerAdapter(pinoInstance);
  }
}

/**
 * Helper function to create a Pino logger with options
 *
 * @param options - Pino logger configuration
 * @returns A logger instance using Pino
 *
 * @example
 * ```ts
 * // Simple logger
 * const logger = createPinoLogger();
 *
 * // With pretty printing for development
 * const logger = createPinoLogger({
 *   level: LogLevel.DEBUG,
 *   transport: {
 *     target: 'pino-pretty',
 *     options: { colorize: true }
 *   }
 * });
 *
 * // With redaction for sensitive data
 * const logger = createPinoLogger({
 *   redact: ['password', 'apiKey', 'creditCard']
 * });
 * ```
 */
export function createPinoLogger(options?: PinoLoggerOptions): Logger {
  const factory = new PinoLoggerFactory(options);
  return factory.createLogger();
}

/**
 * Helper to create Pino logger with common development settings
 */
export function createDevLogger(context?: LoggerContext): Logger {
  return createPinoLogger({
    level: LogLevel.DEBUG,
    context,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  });
}

/**
 * Helper to create Pino logger with common production settings
 */
export function createProdLogger(context?: LoggerContext): Logger {
  return createPinoLogger({
    level: LogLevel.INFO,
    context,
    redact: ['password', 'token', 'apiKey', 'secret', 'authorization'],
  });
}
