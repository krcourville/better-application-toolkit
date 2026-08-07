import { randomUUID } from "node:crypto";
import { OpenAPIHono } from "@hono/zod-openapi";
import { LoggerFacade } from "@batkit/logger";
import { fulfillmentRoute } from "./contract.js";
import { FulfillmentPipeline } from "./fulfillment-pipeline.js";
import { validationHook } from "../lib/validation-hook.js";

const HttpStatus = {
  OK: 200,
} as const;

const logger = LoggerFacade.getLogger("fulfillment.controller");
const pipeline = new FulfillmentPipeline();

export const demoApp = new OpenAPIHono({ defaultHook: validationHook }).openapi(
  fulfillmentRoute,
  async (ctx) => {
    const body = ctx.req.valid("json");
    const transactionId = ctx.req.header("x-transaction-id") ?? randomUUID();

    logger.mergeContext({
      orderId: body.orderId,
      transactionId,
    });
    logger.info("Fulfillment request accepted", { orderId: body.orderId });

    const result = await pipeline.fulfill(body.orderId, body.items);

    return ctx.json(
      {
        data: {
          orderId: body.orderId,
          status: result.status,
          transactionId,
        },
      },
      HttpStatus.OK,
    );
  },
);
