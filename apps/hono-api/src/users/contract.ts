import { createRoute, z } from "@hono/zod-openapi";

const NAME_MIN_LENGTH = 1;
const NAME_MAX_LENGTH = 100;

const UserSchema = z
  .object({
    createdAt: z.string().datetime().openapi({ example: "2026-02-01T12:00:00.000Z" }),
    email: z.string().email().openapi({ example: "jane@example.com" }),
    id: z.string().openapi({ example: "1" }),
    name: z.string().min(NAME_MIN_LENGTH).max(NAME_MAX_LENGTH).openapi({ example: "Jane Doe" }),
  })
  .openapi("User");

export const CreateUserSchema = z
  .object({
    email: z.string().email().openapi({ example: "ada@example.com" }),
    name: z.string().min(NAME_MIN_LENGTH).max(NAME_MAX_LENGTH).openapi({ example: "Ada Lovelace" }),
  })
  .openapi("CreateUser");

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
  .openapi("UpdateUser");

const UserIdParamSchema = z.object({
  id: z.string().openapi({
    example: "1",
    param: { in: "path", name: "id" },
  }),
});

export const listUsersRoute = createRoute({
  method: "get",
  path: "/users",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            data: z.object({
              total: z.number().openapi({ example: 2 }),
              users: z.array(UserSchema),
            }),
          }),
        },
      },
      description: "List of users",
    },
  },
});

export const createUserRoute = createRoute({
  method: "post",
  path: "/users",
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateUserSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: z.object({ data: UserSchema }),
        },
      },
      description: "Created user",
    },
  },
});

export const getUserRoute = createRoute({
  method: "get",
  path: "/users/{id}",
  request: {
    params: UserIdParamSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ data: UserSchema }),
        },
      },
      description: "User",
    },
  },
});

export const updateUserRoute = createRoute({
  method: "put",
  path: "/users/{id}",
  request: {
    body: {
      content: {
        "application/json": {
          schema: UpdateUserSchema,
        },
      },
    },
    params: UserIdParamSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ data: UserSchema }),
        },
      },
      description: "Updated user",
    },
  },
});

export const deleteUserRoute = createRoute({
  method: "delete",
  path: "/users/{id}",
  request: {
    params: UserIdParamSchema,
  },
  responses: {
    204: {
      description: "Deleted",
    },
  },
});
