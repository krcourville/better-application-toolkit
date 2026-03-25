import { randomUUID } from 'node:crypto';
import { LoggerFacade } from '@batkit/logger';
import type { Request } from 'express';
import { FulfillmentPipeline } from './fulfillment-pipeline.js';

type FulfillmentBody = {
  orderId: string;
  items: { sku: string; qty: number }[];
};

type FulfillmentHandlerArgs = {
  body: FulfillmentBody;
  req: Request;
};

export class FulfillmentController {
  private readonly logger = LoggerFacade.getLogger('fulfillment.controller');

  constructor(private readonly pipeline: FulfillmentPipeline) {}

  async handle(args: FulfillmentHandlerArgs) {
    const { body, req } = args;

    const transactionId = req.get('x-transaction-id') ?? randomUUID();
    this.logger.mergeContext({
      transactionId,
      orderId: body.orderId,
    });

    this.logger.info('Fulfillment request accepted', {
      orderId: body.orderId,
    });

    const result = await this.pipeline.fulfill(body.orderId, body.items);

    return {
      status: 200 as const,
      body: {
        data: {
          transactionId,
          orderId: body.orderId,
          status: result.status,
        },
      },
    };
  }
}

const fulfillmentController = new FulfillmentController(new FulfillmentPipeline());

export const demoHandlers = {
  fulfillment: (args: FulfillmentHandlerArgs) => fulfillmentController.handle(args),
};
