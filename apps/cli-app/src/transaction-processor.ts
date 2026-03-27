import { delay } from './async-utils.js';
import { LoggerFacade } from './logging.js';

export class TransactionProcessor {
  private readonly logger = LoggerFacade.getLogger('transaction-processor');

  async process(_transactionId: string): Promise<void> {
    this.logger.info('BEGIN: Processing transaction');
    await delay(50);
    this.logger.info('END: Processing transaction');
  }
}
