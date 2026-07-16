import { extendZodWithOpenApi } from "@anatine/zod-openapi";
import { initContract } from "@ts-rest/core";
import { z } from "zod";

const contract = initContract();

extendZodWithOpenApi(z);

const MIN_LENGTH = 1;

const FulfillmentItemSchema = z
  .object({
    qty: z.number().int().positive().openapi({ example: 2 }),
    sku: z.string().min(MIN_LENGTH).openapi({ example: "SKU-1" }),
  })
  .openapi({
    example: { qty: 2, sku: "SKU-1" },
  });

export const demoContract = contract.router({
  fulfillment: {
    body: z
      .object({
        items: z.array(FulfillmentItemSchema).min(MIN_LENGTH),
        orderId: z.string().min(MIN_LENGTH).openapi({ example: "ord-100" }),
      })
      .openapi({
        example: {
          items: [{ qty: 1, sku: "SKU-1" }],
          orderId: "ord-100",
        },
      }),
    method: "POST",
    path: "/demo/fulfillment",
    responses: {
      200: z.object({
        data: z.object({
          orderId: z.string(),
          status: z.literal("fulfilled"),
          transactionId: z.string(),
        }),
      }),
    },
  },
});
