// Export types
export { LogLevel, LOG_LEVEL_VALUES } from './types.js';
export type { Logger, LoggerContext, LoggerFactory, LoggerOptions } from './types.js';

// Export console logger implementation as main export
export { ConsoleLogger, ConsoleLoggerFactory, createConsoleLogger } from './console-logger.js';
