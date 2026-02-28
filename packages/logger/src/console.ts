// Separate entry point for console logger (for tree-shaking)
export { ConsoleLogger, ConsoleLoggerFactory, createConsoleLogger } from './console-logger.js';
export { LogLevel, LOG_LEVEL_VALUES } from './types.js';
export type { Logger, LoggerContext, LoggerFactory, LoggerOptions } from './types.js';
