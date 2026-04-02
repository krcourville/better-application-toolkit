import { ConsoleLoggerProvider } from "./console-logger.js";
import type { Logger, LoggerProvider } from "./types.js";

/**
 * Singleton facade for logging with pluggable providers
 *
 * The LoggerFacade provides a module-level API for getting named loggers while allowing
 * the underlying implementation (provider) to be swapped at runtime.
 *
 * @example
 * ```typescript
 * // Get a logger for your module
 * const logger = LoggerFacade.getLogger('myapp:database');
 *
 * // Use it with opinionated signatures
 * logger.info("Database connected", { host: 'localhost' });
 * logger.error(new Error("Connection failed"), "Failed to connect", { retries: 3 });
 *
 * // Swap the provider (e.g., from console to pino)
 * LoggerFacade.setProvider(new PinoLoggerProvider());
 * ```
 */

let _provider: LoggerProvider = new ConsoleLoggerProvider();

/**
 * Get a logger for a given name
 * @param name - Logger name (e.g., 'database', 'auth', 'api')
 * @returns A Logger instance
 */
function getLogger(name: string): Logger {
  return _provider.getLogger(name);
}

/**
 * Set the logging provider implementation
 * @param provider - A LoggerProvider instance (e.g., ConsoleLoggerProvider, PinoLoggerProvider)
 */
function setProvider(provider: LoggerProvider): void {
  _provider = provider;
}

/**
 * Configure the current provider with options
 * Useful for setting default log level, context, pretty-printing, etc.
 * @param options - Logger configuration options
 */
function configure(): void {
  // Create a new provider with the updated options
  _provider = new ConsoleLoggerProvider();
}

/**
 * Get the current provider
 * (useful for testing or advanced scenarios)
 */
function getProvider(): LoggerProvider {
  return _provider;
}

/**
 * Namespace-style export for convenient module-level API
 */
export const LoggerFacade = {
  getLogger,
  setProvider,
  configure,
  getProvider,
};
