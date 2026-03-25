import { extendZodWithOpenApi } from '@anatine/zod-openapi';
import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

extendZodWithOpenApi(z);

export const FulfillmentItemSchema = z
  .object({
    sku: z.string().min(1).openapi({ example: 'SKU-1' }),
    qty: z.number().int().positive().openapi({ example: 2 }),
  })
  .openapi({
    example: { sku: 'SKU-1', qty: 2 },
  });

export const demoContract = c.router({
  fulfillment: {
    method: 'POST',
    path: '/demo/fulfillment',
    body: z
      .object({
        orderId: z.string().min(1).openapi({ example: 'ord-100' }),
        items: z.array(FulfillmentItemSchema).min(1),
      })
      .openapi({
        example: {
          orderId: 'ord-100',
          items: [{ sku: 'SKU-1', qty: 1 }],
        },
      }),
    responses: {
      200: z.object({
        data: z.object({
          transactionId: z.string(),
          orderId: z.string(),
          status: z.literal('fulfilled'),
        }),
      }),
    },
  },
});
