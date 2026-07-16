import { randomUUID } from "node:crypto";
import { LoggerFacade } from "@batkit/logger";
import type { Request } from "express";
import { FulfillmentPipeline } from "./fulfillment-pipeline.js";

interface FulfillmentBody {
  orderId: string;
  items: { sku: string; qty: number }[];
}

interface FulfillmentHandlerArgs {
  body: FulfillmentBody;
  req: Request;
}

const HttpStatus = {
  OK: 200,
} as const;

class FulfillmentController {
  private readonly logger = LoggerFacade.getLogger("fulfillment.controller");
  private readonly pipeline: FulfillmentPipeline;

  constructor(pipeline: FulfillmentPipeline) {
    this.pipeline = pipeline;
  }

  async handle(args: FulfillmentHandlerArgs) {
    const { body, req } = args;

    const transactionId = req.get("x-transaction-id") ?? randomUUID();
    this.logger.mergeContext({
      orderId: body.orderId,
      transactionId,
    });

    this.logger.info("Fulfillment request accepted", {
      orderId: body.orderId,
    });

    const result = await this.pipeline.fulfill(body.orderId, body.items);

    return {
      body: {
        data: {
          orderId: body.orderId,
          status: result.status,
          transactionId,
        },
      },
      status: HttpStatus.OK,
    };
  }
}

const fulfillmentController = new FulfillmentController(new FulfillmentPipeline());

export const demoHandlers = {
  fulfillment: (args: FulfillmentHandlerArgs) => fulfillmentController.handle(args),
};
