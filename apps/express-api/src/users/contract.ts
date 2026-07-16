import { extendZodWithOpenApi } from "@anatine/zod-openapi";
import { initContract } from "@ts-rest/core";
import { z } from "zod";

const contract = initContract();

extendZodWithOpenApi(z);

const NAME_MIN_LENGTH = 1;
const NAME_MAX_LENGTH = 100;

const UserSchema = z
  .object({
    createdAt: z.string().datetime().openapi({ example: "2026-02-01T12:00:00.000Z" }),
    email: z.string().email().openapi({ example: "jane@example.com" }),
    id: z.string().openapi({ example: "1" }),
    name: z.string().min(NAME_MIN_LENGTH).max(NAME_MAX_LENGTH).openapi({ example: "Jane Doe" }),
  })
  .openapi({
    example: {
      createdAt: "2026-02-01T12:00:00.000Z",
      email: "jane@example.com",
      id: "1",
      name: "Jane Doe",
    },
  });

export const CreateUserSchema = z
  .object({
    email: z.string().email().openapi({ example: "ada@example.com" }),
    name: z.string().min(NAME_MIN_LENGTH).max(NAME_MAX_LENGTH).openapi({ example: "Ada Lovelace" }),
  })
  .openapi({
    example: {
      email: "ada@example.com",
      name: "Ada Lovelace",
    },
  });

export const UpdateUserSchema = z
  .object({
    email: z.string().email().optional().openapi({ example: "ada@example.com" }),
    name: z
      .string()
      .min(NAME_MIN_LENGTH)
      .max(NAME_MAX_LENGTH)
      .optional()
      .openapi({ example: "Ada Lovelace" }),
  })
  .openapi({
    example: {
      name: "Ada Lovelace",
    },
  });

export const usersContract = contract.router({
  create: {
    body: CreateUserSchema,
    method: "POST",
    path: "/users",
    responses: {
      201: z.object({ data: UserSchema }),
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
  list: {
    method: "GET",
    path: "/users",
    responses: {
      200: z
        .object({
          data: z
            .object({
              total: z.number().openapi({ example: 2 }),
              users: z.array(UserSchema),
            })
            .openapi({
              example: {
                total: 2,
                users: [
                  {
                    createdAt: "2026-01-01T00:00:00.000Z",
                    email: "john@example.com",
                    id: "1",
                    name: "John Doe",
                  },
                  {
                    createdAt: "2026-01-15T00:00:00.000Z",
                    email: "jane@example.com",
                    id: "2",
                    name: "Jane Smith",
                  },
                ],
              },
            }),
        })
        .openapi({
          example: {
            data: {
              total: 2,
              users: [
                {
                  createdAt: "2026-01-01T00:00:00.000Z",
                  email: "john@example.com",
                  id: "1",
                  name: "John Doe",
                },
                {
                  createdAt: "2026-01-15T00:00:00.000Z",
                  email: "jane@example.com",
                  id: "2",
                  name: "Jane Smith",
                },
              ],
            },
          },
        }),
    },
  },
  update: {
    body: UpdateUserSchema,
    method: "PUT",
    path: "/users/:id",
    pathParams: z.object({
      id: z.string(),
    }),
    responses: {
      200: z.object({ data: UserSchema }),
    },
  },
});
