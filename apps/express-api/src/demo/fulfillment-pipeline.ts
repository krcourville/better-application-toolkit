import { ValidationError } from "@batkit/errors";
import { LoggerFacade } from "@batkit/logger";
import { delay } from "../lib/async-utils";

export interface FulfillmentItem {
  sku: string;
  qty: number;
}

const INITIAL_STOCK = 100;
const NO_STOCK = 0;
const RESERVE_STEP_DELAY_MS = 15;
const PAYMENT_STEP_DELAY_MS = 10;

/**
 * Multi-step async fulfillment. Correlation fields are expected to be merged into
 * async-local log context by the caller (e.g. HTTP controller) so steps log them
 * without threading extra parameters.
 */
export class FulfillmentPipeline {
  /** In-memory stock for demo only (not reset between requests). */
  readonly #inventory = new Map<string, number>([["SKU-1", INITIAL_STOCK]]);

  private readonly logger = LoggerFacade.getLogger("fulfillment.pipeline");

  async fulfill(orderId: string, items: FulfillmentItem[]): Promise<{ status: "fulfilled" }> {
    this.logger.mergeContext({ orderId });
    this.logger.info("Pipeline start", { lineCount: items.length });

    await delay(RESERVE_STEP_DELAY_MS);

    const reserved: FulfillmentItem[] = [];
    try {
      for (const item of items) {
        this.#reserveLine(item);
        reserved.push(item);
      }
    } catch (error) {
      this.#rollback(reserved);
      throw error;
    }

    await delay(PAYMENT_STEP_DELAY_MS);

    this.logger.info("Payment stub succeeded");
    this.logger.info("Pipeline complete");
    return { status: "fulfilled" };
  }

  #reserveLine(item: FulfillmentItem): void {
    const available = this.#inventory.get(item.sku) ?? NO_STOCK;
    if (available < item.qty) {
      throw new ValidationError("Insufficient stock", [
        {
          field: item.sku,
          message: `Only ${available} available, requested ${item.qty}`,
          value: item.qty,
        },
      ]);
    }
    this.#inventory.set(item.sku, available - item.qty);
    this.logger.info("Stock reserved", {
      qty: item.qty,
      sku: item.sku,
    });
  }

  #rollback(items: FulfillmentItem[]): void {
    for (const item of items) {
      const available = this.#inventory.get(item.sku) ?? NO_STOCK;
      this.#inventory.set(item.sku, available + item.qty);
      this.logger.info("Stock reservation rolled back", {
        qty: item.qty,
        sku: item.sku,
      });
    }
  }
}
