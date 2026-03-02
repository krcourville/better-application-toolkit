import type { LogLevel, LogMethod, Logger, LoggerProvider } from "./types.js";

/**
 * Simple console-based logger that delegates to console methods
 */
class ConsoleLogger implements Logger {
  public readonly debug: LogMethod;
  public readonly info: LogMethod;
  public readonly warn: LogMethod;
  public readonly error: LogMethod;

  constructor(name: string) {
    this.debug = console.debug.bind(console, `[${name}]`);
    this.info = console.info.bind(console, `[${name}]`);
    this.warn = console.warn.bind(console, `[${name}]`);
    this.error = console.error.bind(console, `[${name}]`);
  }
}

/**
 * Console-based logger provider that creates logger instances
 */
export class ConsoleLoggerProvider implements LoggerProvider {
  getLogger(name: string): Logger {
    return new ConsoleLogger(name);
  }

  isLogLevelEnabled(_level: LogLevel): boolean {
    return true;
  }
}

/**
 * Helper function to create a console logger provider with options
 * @param options - Logger configuration options (unused, for API compatibility)
 * @returns A console logger provider instance
 */
export function createConsoleLoggerProvider(): LoggerProvider {
  return new ConsoleLoggerProvider();
}
