import { ValidationError } from '@batkit/errors';
import { LoggerFacade } from '@batkit/logger';
import { delay } from '../lib/async-utils';

export type FulfillmentItem = { sku: string; qty: number };

/**
 * Multi-step async fulfillment. Correlation fields are expected to be merged into
 * async-local log context by the caller (e.g. HTTP controller) so steps log them
 * without threading extra parameters.
 */
export class FulfillmentPipeline {
  /** In-memory stock for demo only (not reset between requests). */
  readonly #inventory = new Map<string, number>([['SKU-1', 100]]);

  private readonly logger = LoggerFacade.getLogger('fulfillment.pipeline');

  async fulfill(orderId: string, items: FulfillmentItem[]): Promise<{ status: 'fulfilled' }> {
    this.logger.mergeContext({ orderId });
    this.logger.info('Pipeline start', { lineCount: items.length });

    await delay(15);

    for (const item of items) {
      this.#reserveLine(item);
    }

    await delay(10);

    this.logger.info('Payment stub succeeded');
    this.logger.info('Pipeline complete');
    return { status: 'fulfilled' };
  }

  #reserveLine(item: FulfillmentItem): void {
    const available = this.#inventory.get(item.sku) ?? 0;
    if (available < item.qty) {
      throw new ValidationError('Insufficient stock', [
        {
          field: item.sku,
          message: `Only ${available} available, requested ${item.qty}`,
          value: item.qty,
        },
      ]);
    }
    this.#inventory.set(item.sku, available - item.qty);
    this.logger.info('Stock reserved', {
      sku: item.sku,
      qty: item.qty,
    });
  }
}
