import { randomUUID } from "node:crypto";
import { NotFoundError, ValidationError } from "@batkit/errors";
import { LoggerFacade } from "@batkit/logger";
import { OpenAPIHono } from "@hono/zod-openapi";
import {
  CreateUserSchema,
  UpdateUserSchema,
  createUserRoute,
  deleteUserRoute,
  getUserRoute,
  listUsersRoute,
  updateUserRoute,
} from "./contract.js";
import { validationHook } from "../lib/validation-hook.js";

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

const HttpStatus = {
  CREATED: 201,
  NO_CONTENT: 204,
  OK: 200,
} as const;

const FIRST_PATH_SEGMENT = 0;

// Initialize with sample data
const users = new Map<string, User>([
  [
    "1",
    {
      createdAt: new Date("2026-01-01"),
      email: "john@example.com",
      id: "1",
      name: "John Doe",
    },
  ],
  [
    "2",
    {
      createdAt: new Date("2026-01-15"),
      email: "jane@example.com",
      id: "2",
      name: "Jane Smith",
    },
  ],
]);

function toUserResponse(user: User) {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
  };
}

function assertEmailAvailable(email: string): void {
  const existingUser = [...users.values()].find((existing) => existing.email === email);
  if (existingUser) {
    throw new ValidationError("Email must be unique", [
      { field: "email", message: "Email must be unique", value: email },
    ]);
  }
}

export const usersApp = new OpenAPIHono({ defaultHook: validationHook })
  .openapi(listUsersRoute, (ctx) => {
    const logger = LoggerFacade.getLogger("userHandlers.list");
    logger.info("Listing all users");

    const userList = [...users.values()].map((user) => toUserResponse(user));
    return ctx.json(
      {
        data: {
          total: userList.length,
          users: userList,
        },
      },
      HttpStatus.OK,
    );
  })
  .openapi(createUserRoute, (ctx) => {
    const logger = LoggerFacade.getLogger("userHandlers.create");
    const body = ctx.req.valid("json");
    logger.info("Creating new user", { body });

    const result = CreateUserSchema.safeParse(body);
    if (!result.success) {
      const validationErrors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        value: body[issue.path[FIRST_PATH_SEGMENT] as "name" | "email"],
      }));
      throw new ValidationError("Invalid user data", validationErrors);
    }

    const userData = result.data;
    assertEmailAvailable(userData.email);

    const id = randomUUID();
    const user: User = {
      id,
      ...userData,
      createdAt: new Date(),
    };
    users.set(id, user);

    logger.info("User created successfully", { userId: id });
    return ctx.json({ data: toUserResponse(user) }, HttpStatus.CREATED);
  })
  .openapi(getUserRoute, (ctx) => {
    const logger = LoggerFacade.getLogger("userHandlers.get");
    const { id } = ctx.req.valid("param");
    logger.info("Fetching user", { userId: id });

    const user = users.get(id);
    if (!user) {
      throw new NotFoundError("User", id);
    }

    return ctx.json({ data: toUserResponse(user) }, HttpStatus.OK);
  })
  .openapi(updateUserRoute, (ctx) => {
    const logger = LoggerFacade.getLogger("userHandlers.update");
    const { id } = ctx.req.valid("param");
    const body = ctx.req.valid("json");
    logger.info("Updating user", { body, userId: id });

    const user = users.get(id);
    if (!user) {
      throw new NotFoundError("User", id);
    }

    const result = UpdateUserSchema.safeParse(body);
    if (!result.success) {
      const validationErrors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      throw new ValidationError("Invalid update data", validationErrors);
    }

    const updates = result.data;
    if (updates.email && updates.email !== user.email) {
      assertEmailAvailable(updates.email);
    }

    const updatedUser = { ...user, ...updates };
    users.set(id, updatedUser);

    logger.info("User updated successfully", { userId: id });
    return ctx.json({ data: toUserResponse(updatedUser) }, HttpStatus.OK);
  })
  .openapi(deleteUserRoute, (ctx) => {
    const logger = LoggerFacade.getLogger("userHandlers.delete");
    const { id } = ctx.req.valid("param");
    logger.info("Deleting user", { userId: id });

    const user = users.get(id);
    if (!user) {
      throw new NotFoundError("User", id);
    }

    users.delete(id);

    logger.info("User deleted successfully", { userId: id });
    return ctx.body(null, HttpStatus.NO_CONTENT);
  });
