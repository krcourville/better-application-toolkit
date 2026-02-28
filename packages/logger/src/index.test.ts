import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsoleLogger, ConsoleLoggerFactory, LogLevel, createConsoleLogger } from './index.js';

describe('@batkit/logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ConsoleLogger', () => {
    it('should create a logger with default options', () => {
      const logger = new ConsoleLogger();
      expect(logger).toBeDefined();
    });

    it('should log at different levels', () => {
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const logger = new ConsoleLogger({ level: LogLevel.DEBUG });

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      expect(debugSpy).toHaveBeenCalled();
      expect(infoSpy).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should respect log level filtering', () => {
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      const logger = new ConsoleLogger({ level: LogLevel.WARN });

      logger.debug('Should not log');
      logger.info('Should not log');
      logger.warn('Should log');

      expect(debugSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
    });

    it('should create child logger with merged context', () => {
      const logger = new ConsoleLogger({ context: { app: 'test' } });
      const child = logger.child({ requestId: '123' });

      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      child.info('Test message');

      expect(infoSpy).toHaveBeenCalled();
    });

    it('should handle Error objects in logs', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const logger = new ConsoleLogger({ level: LogLevel.ERROR, pretty: false });

      const error = new Error('Test error');
      logger.error('An error occurred', error);

      expect(errorSpy).toHaveBeenCalled();
      const loggedData = JSON.parse(errorSpy.mock.calls[0]?.[0] as string);
      expect(loggedData.error).toBeDefined();
      expect(loggedData.error.message).toBe('Test error');
    });

    it('should merge object arguments into log data', () => {
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const logger = new ConsoleLogger({ pretty: false });

      logger.info('User action', { userId: '123', action: 'login' });

      expect(infoSpy).toHaveBeenCalled();
      const loggedData = JSON.parse(infoSpy.mock.calls[0]?.[0] as string);
      expect(loggedData.userId).toBe('123');
      expect(loggedData.action).toBe('login');
    });
  });

  describe('ConsoleLoggerFactory', () => {
    it('should create loggers with default options', () => {
      const factory = new ConsoleLoggerFactory({ level: LogLevel.DEBUG });
      const logger = factory.createLogger();

      expect(logger).toBeDefined();
    });

    it('should merge context when creating loggers', () => {
      const factory = new ConsoleLoggerFactory({ context: { app: 'test' } });
      const logger = factory.createLogger({ service: 'api' });

      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      logger.info('Test');

      expect(infoSpy).toHaveBeenCalled();
    });
  });

  describe('createConsoleLogger', () => {
    it('should create a logger with options', () => {
      const logger = createConsoleLogger({ level: LogLevel.WARN });
      expect(logger).toBeDefined();
    });

    it('should create a logger without options', () => {
      const logger = createConsoleLogger();
      expect(logger).toBeDefined();
    });
  });
});
