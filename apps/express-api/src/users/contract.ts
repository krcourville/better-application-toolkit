import { extendZodWithOpenApi } from "@anatine/zod-openapi";
import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

extendZodWithOpenApi(z);

export const UserSchema = z
  .object({
    id: z.string().openapi({ example: "1" }),
    name: z.string().min(1).max(100).openapi({ example: "Jane Doe" }),
    email: z.string().email().openapi({ example: "jane@example.com" }),
    createdAt: z.string().datetime().openapi({ example: "2026-02-01T12:00:00.000Z" }),
  })
  .openapi({
    example: {
      id: "1",
      name: "Jane Doe",
      email: "jane@example.com",
      createdAt: "2026-02-01T12:00:00.000Z",
    },
  });

export const CreateUserSchema = z
  .object({
    name: z.string().min(1).max(100).openapi({ example: "Ada Lovelace" }),
    email: z.string().email().openapi({ example: "ada@example.com" }),
  })
  .openapi({
    example: {
      name: "Ada Lovelace",
      email: "ada@example.com",
    },
  });

export const UpdateUserSchema = z
  .object({
    name: z.string().min(1).max(100).optional().openapi({ example: "Ada Lovelace" }),
    email: z.string().email().optional().openapi({ example: "ada@example.com" }),
  })
  .openapi({
    example: {
      name: "Ada Lovelace",
    },
  });

export const usersContract = c.router({
  list: {
    method: "GET",
    path: "/users",
    responses: {
      200: z
        .object({
          data: z
            .object({
              users: z.array(UserSchema),
              total: z.number().openapi({ example: 2 }),
            })
            .openapi({
              example: {
                users: [
                  {
                    id: "1",
                    name: "John Doe",
                    email: "john@example.com",
                    createdAt: "2026-01-01T00:00:00.000Z",
                  },
                  {
                    id: "2",
                    name: "Jane Smith",
                    email: "jane@example.com",
                    createdAt: "2026-01-15T00:00:00.000Z",
                  },
                ],
                total: 2,
              },
            }),
        })
        .openapi({
          example: {
            data: {
              users: [
                {
                  id: "1",
                  name: "John Doe",
                  email: "john@example.com",
                  createdAt: "2026-01-01T00:00:00.000Z",
                },
                {
                  id: "2",
                  name: "Jane Smith",
                  email: "jane@example.com",
                  createdAt: "2026-01-15T00:00:00.000Z",
                },
              ],
              total: 2,
            },
          },
        }),
    },
  },
  get: {
    method: "GET",
    path: "/users/:id",
    pathParams: z.object({
      id: z.string(),
    }),
    responses: {
      200: z.object({ data: UserSchema }),
    },
  },
  create: {
    method: "POST",
    path: "/users",
    body: CreateUserSchema,
    responses: {
      201: z.object({ data: UserSchema }),
    },
  },
  update: {
    method: "PUT",
    path: "/users/:id",
    pathParams: z.object({
      id: z.string(),
    }),
    body: UpdateUserSchema,
    responses: {
      200: z.object({ data: UserSchema }),
    },
  },
  delete: {
    method: "DELETE",
    path: "/users/:id",
    pathParams: z.object({
      id: z.string(),
    }),
    responses: {
      204: z.null(),
    },
  },
});
