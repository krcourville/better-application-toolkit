import { extendZodWithOpenApi } from '@anatine/zod-openapi';
import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

extendZodWithOpenApi(z);

export const UserSchema = z
  .object({
    id: z.string().openapi({ example: '1' }),
    name: z.string().min(1).max(100).openapi({ example: 'Jane Doe' }),
    email: z.string().email().openapi({ example: 'jane@example.com' }),
    createdAt: z.string().datetime().openapi({ example: '2026-02-01T12:00:00.000Z' }),
  })
  .openapi({
    example: {
      id: '1',
      name: 'Jane Doe',
      email: 'jane@example.com',
      createdAt: '2026-02-01T12:00:00.000Z',
    },
  });

export const CreateUserSchema = z
  .object({
    name: z.string().min(1).max(100).openapi({ example: 'Ada Lovelace' }),
    email: z.string().email().openapi({ example: 'ada@example.com' }),
  })
  .openapi({
    example: {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
    },
  });

export const UpdateUserSchema = z
  .object({
    name: z.string().min(1).max(100).optional().openapi({ example: 'Ada Lovelace' }),
    email: z.string().email().optional().openapi({ example: 'ada@example.com' }),
  })
  .openapi({
    example: {
      name: 'Ada Lovelace',
    },
  });

export const apiContract = c.router(
  {
    info: {
      method: 'GET',
      path: '/',
      responses: {
        200: z
          .object({
            message: z.string().openapi({ example: 'Better Application Toolkit - Express API Reference' }),
            version: z.string().openapi({ example: '1.0.0' }),
            endpoints: z.record(z.any()),
          })
          .openapi({
            example: {
              message: 'Better Application Toolkit - Express API Reference',
              version: '1.0.0',
              endpoints: {
                health: 'GET /health',
                openApi: 'GET /openapi.json',
                docs: 'GET /docs',
              },
            },
          }),
      },
    },
    users: {
      list: {
        method: 'GET',
        path: '/users',
        responses: {
          200: z
            .object({
              users: z.array(UserSchema),
              total: z.number().openapi({ example: 2 }),
            })
            .openapi({
              example: {
                users: [
                  {
                    id: '1',
                    name: 'John Doe',
                    email: 'john@example.com',
                    createdAt: '2026-01-01T00:00:00.000Z',
                  },
                  {
                    id: '2',
                    name: 'Jane Smith',
                    email: 'jane@example.com',
                    createdAt: '2026-01-15T00:00:00.000Z',
                  },
                ],
                total: 2,
              },
            }),
        },
      },
      get: {
        method: 'GET',
        path: '/users/:id',
        pathParams: z.object({
          id: z.string(),
        }),
        responses: {
          200: UserSchema,
        },
      },
      create: {
        method: 'POST',
        path: '/users',
        body: CreateUserSchema,
        responses: {
          201: UserSchema,
        },
      },
      update: {
        method: 'PUT',
        path: '/users/:id',
        pathParams: z.object({
          id: z.string(),
        }),
        body: UpdateUserSchema,
        responses: {
          200: UserSchema,
        },
      },
      delete: {
        method: 'DELETE',
        path: '/users/:id',
        pathParams: z.object({
          id: z.string(),
        }),
        responses: {
          204: z.null(),
        },
      },
    },
    errors: {
      badRequest: {
        method: 'GET',
        path: '/errors/400',
        responses: {
          204: z.null(),
        },
      },
      unauthorized: {
        method: 'GET',
        path: '/errors/401',
        responses: {
          204: z.null(),
        },
      },
      forbidden: {
        method: 'GET',
        path: '/errors/403',
        responses: {
          204: z.null(),
        },
      },
      notFound: {
        method: 'GET',
        path: '/errors/404',
        responses: {
          204: z.null(),
        },
      },
      conflict: {
        method: 'GET',
        path: '/errors/409',
        responses: {
          204: z.null(),
        },
      },
      validation: {
        method: 'GET',
        path: '/errors/422',
        responses: {
          204: z.null(),
        },
      },
      rateLimit: {
        method: 'GET',
        path: '/errors/429',
        responses: {
          204: z.null(),
        },
      },
      internal: {
        method: 'GET',
        path: '/errors/500',
        responses: {
          204: z.null(),
        },
      },
      serviceUnavailable: {
        method: 'GET',
        path: '/errors/503',
        responses: {
          204: z.null(),
        },
      },
      generic: {
        method: 'GET',
        path: '/errors/generic',
        responses: {
          204: z.null(),
        },
      },
    },
    context: {
      show: {
        method: 'GET',
        path: '/context',
        responses: {
          200: z
            .object({
              message: z.string().openapi({ example: 'Context information' }),
              requestId: z.string().optional().openapi({ example: 'req_123' }),
              userId: z.string().optional().openapi({ example: 'user_42' }),
              metadata: z.record(z.any()).optional(),
              contextFromUtil: z.object({
                requestId: z.string().optional().openapi({ example: 'req_123' }),
                hasLogger: z.boolean().openapi({ example: true }),
              }),
            })
            .openapi({
              example: {
                message: 'Context information',
                requestId: 'req_123',
                userId: 'user_42',
                metadata: {
                  operation: 'show-context',
                },
                contextFromUtil: {
                  requestId: 'req_123',
                  hasLogger: true,
                },
              },
            }),
        },
      },
      nested: {
        method: 'GET',
        path: '/context/nested',
        responses: {
          200: z.object({
            message: z.string(),
            result: z.string(),
          }),
        },
      },
    },
  },
  {
    pathPrefix: '/api',
  }
);
