import type {
  LogLevel,
  LoggerProvider,
} from '@batkit/logger';
import { pino, type Logger, type LoggerOptions } from "pino";

/**
 * Pino-based logger provider implementing LoggerProvider
 */
export class PinoLoggerProvider implements LoggerProvider {
  private readonly rootLogger: Logger;

  constructor(config?: LoggerOptions) {
    this.rootLogger = pino(config);
  }

  getLogger(name: string): Logger {
    return this.rootLogger.child({ name });
  }

  isLogLevelEnabled(level: LogLevel): boolean {
    return this.rootLogger.isLevelEnabled(level);
  }
}
