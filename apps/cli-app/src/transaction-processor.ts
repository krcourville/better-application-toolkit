import { delay } from './async-utils.js';
import { LoggerFacade } from './logging.js';

export class TransactionProcessor {
  private readonly logger = LoggerFacade.getLogger('transaction-processor');

  async process(transactionId: string): Promise<void> {
    this.logger.info('BEGIN: Processing transaction', { transactionId });
    await delay(50);
    this.logger.info('END: Processing transaction', { transactionId });
  }
}
