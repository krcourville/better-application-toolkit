import type { Logger as BatkitLogger, LogLevel, LoggerProvider } from '@batkit/logger';
import { type LoggerOptions, type Logger as PinoLogger, pino } from 'pino';

import { adaptPinoToBatkitLogger } from './pino-batkit-adapter.js';

/** Lowercase names pino accepts in {@link PinoLogger.isLevelEnabled}. */
const BATKIT_TO_PINO: Record<LogLevel, 'debug' | 'info' | 'warn' | 'error' | 'fatal'> = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal',
};

/**
 * Pino-based logger provider implementing LoggerProvider
 */
export class PinoLoggerProvider implements LoggerProvider {
  private readonly rootLogger: PinoLogger;

  constructor(config?: LoggerOptions) {
    this.rootLogger = pino(config);
  }

  getLogger(name: string): BatkitLogger {
    return adaptPinoToBatkitLogger(this.rootLogger.child({ name }));
  }

  isLogLevelEnabled(level: LogLevel): boolean {
    return this.rootLogger.isLevelEnabled(BATKIT_TO_PINO[level]);
  }
}

export { adaptPinoToBatkitLogger } from './pino-batkit-adapter.js';
