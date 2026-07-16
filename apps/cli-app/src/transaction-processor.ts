import { delay } from "./async-utils.js";
import { LoggerFacade } from "./logging.js";

const PROCESSING_DELAY_MS = 50;

export class TransactionProcessor {
  private readonly logger = LoggerFacade.getLogger("transaction-processor");

  async process(_transactionId: string): Promise<void> {
    this.logger.info("BEGIN: Processing transaction");
    await delay(PROCESSING_DELAY_MS);
    this.logger.info("END: Processing transaction");
  }
}
