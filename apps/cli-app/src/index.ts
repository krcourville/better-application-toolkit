import { LoggerFacade } from './logging.js';
import { TransactionProcessor } from './transaction-processor.js';

const correlationId = 'AA-1234567890';

const logger = LoggerFacade.getLogger('cli-app.main');

/**
 * Tiny CLI flow that exercises named loggers and async-local context.
 * Use {@link Logger.runWithContext} (same implementation as `@batkit/logger/async-local`)
 * so nested logs see merged fields; `logging.ts` uses {@link ContextualLoggerProvider}.
 */
async function main(): Promise<void> {
  logger.info('Begin processing');
  const transactionIds = ['111', '222', '333'];
  logger.info(`Found ${transactionIds.length} transactions`);

  const processor = new TransactionProcessor();

  for (const transactionId of transactionIds) {
    await logger.runWithContext({ transactionId }, async () => {
      await processor.process(transactionId);
    });
  }

  logger.info('Finished processing');
}

await logger.runWithContext({ correlationId }, main);
