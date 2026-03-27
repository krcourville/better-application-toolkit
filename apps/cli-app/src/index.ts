import { runWithLogContext } from '@batkit/logger/async-local';

import { LoggerFacade } from './logging.js';
import { TransactionProcessor } from './transaction-processor.js';

const correlationId = 'AA-1234567890';

const logger = LoggerFacade.getLogger('cli-app.main');

/**
 * Tiny CLI flow that exercises named loggers and async-local context.
 * Wrap work in {@link runWithLogContext} so {@link Logger.mergeContext} has a store;
 * use {@link ContextualLoggerProvider} in logging.ts so ALS fields appear on every line.
 */
async function main(): Promise<void> {
  logger.info('Begin processing');
  const transactionIds = ['111', '222', '333'];
  logger.info(`Found ${transactionIds.length} transactions`);

  const processor = new TransactionProcessor();

  for (const transactionId of transactionIds) {
    await runWithLogContext({ transactionId }, async () => {
      LoggerFacade.getLogger('cli-app.main').info('CLI demo starting');
      await processor.process(transactionId);
    });
  }

  logger.info('Finished processing');
}

await runWithLogContext({ correlationId }, main);
