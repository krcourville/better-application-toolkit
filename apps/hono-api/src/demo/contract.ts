import { createRoute, z } from "@hono/zod-openapi";

const MIN_LENGTH = 1;

const FulfillmentItemSchema = z
  .object({
    qty: z.number().int().positive().openapi({ example: 2 }),
    sku: z.string().min(MIN_LENGTH).openapi({ example: "SKU-1" }),
  })
  .openapi({
    example: { qty: 2, sku: "SKU-1" },
  });

const FulfillmentRequestSchema = z
  .object({
    items: z.array(FulfillmentItemSchema).min(MIN_LENGTH),
    orderId: z.string().min(MIN_LENGTH).openapi({ example: "ord-100" }),
  })
  .openapi({
    example: {
      items: [{ qty: 1, sku: "SKU-1" }],
      orderId: "ord-100",
    },
  });

const FulfillmentResponseSchema = z.object({
  data: z.object({
    orderId: z.string(),
    status: z.literal("fulfilled"),
    transactionId: z.string(),
  }),
});

export const fulfillmentRoute = createRoute({
  method: "post",
  path: "/demo/fulfillment",
  request: {
    body: {
      content: {
        "application/json": {
          schema: FulfillmentRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: FulfillmentResponseSchema,
        },
      },
      description: "Order fulfilled",
    },
  },
});
