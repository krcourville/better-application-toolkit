// Export types
export type { LogLevel, LogValue } from "./types.js";
export type { Logger, LogMethod, LoggerOptions, LoggerProvider } from "./types.js";

// Export console logger implementation
export { ConsoleLoggerProvider, createConsoleLoggerProvider } from "./console-logger.js";

// Export LoggerFacade (main API)
export { LoggerFacade } from "./logger-facade.js";
