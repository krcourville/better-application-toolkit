import { LogLevel } from '@batkit/logger';
import { describe, expect, it } from 'vitest';
import {
  PinoLoggerAdapter,
  PinoLoggerFactory,
  createDevLogger,
  createPinoLogger,
  createProdLogger,
} from './index.js';

describe('@batkit/logger-pino', () => {
  describe('createPinoLogger', () => {
    it('should create a logger', () => {
      const logger = createPinoLogger();
      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
    });

    it('should create a logger with options', () => {
      const logger = createPinoLogger({
        level: LogLevel.DEBUG,
        context: { app: 'test' },
      });
      expect(logger).toBeDefined();
    });
  });

  describe('createDevLogger', () => {
    it('should create a development logger', () => {
      const logger = createDevLogger({ service: 'test' });
      expect(logger).toBeDefined();
    });
  });

  describe('createProdLogger', () => {
    it('should create a production logger', () => {
      const logger = createProdLogger({ service: 'test' });
      expect(logger).toBeDefined();
    });
  });

  describe('PinoLoggerFactory', () => {
    it('should create loggers with factory', () => {
      const factory = new PinoLoggerFactory({ level: LogLevel.INFO });
      const logger = factory.createLogger({ module: 'test' });
      expect(logger).toBeDefined();
    });
  });

  describe('PinoLoggerAdapter', () => {
    it('should support all log levels', () => {
      const logger = createPinoLogger();

      // Should not throw
      expect(() => {
        logger.debug('Debug message');
        logger.info('Info message');
        logger.warn('Warn message');
        logger.error('Error message');
      }).not.toThrow();
    });

    it('should create child loggers', () => {
      const logger = createPinoLogger({ context: { app: 'test' } });
      const child = logger.child({ requestId: '123' });

      expect(child).toBeDefined();
      expect(() => child.info('Test message')).not.toThrow();
    });

    it('should handle errors in logs', () => {
      const logger = createPinoLogger();
      const error = new Error('Test error');

      expect(() => logger.error('An error occurred', error)).not.toThrow();
    });

    it('should handle object arguments', () => {
      const logger = createPinoLogger();

      expect(() => {
        logger.info('User action', { userId: '123', action: 'login' });
      }).not.toThrow();
    });
  });
});
