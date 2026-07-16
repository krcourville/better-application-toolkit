import { randomUUID } from "node:crypto";
import { NotFoundError, ValidationError } from "@batkit/errors";
import type { Request } from "express";
import { CreateUserSchema, UpdateUserSchema } from "./contract";
import { LoggerFacade } from "@batkit/logger";

// Simple in-memory user store
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

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

const HttpStatus = {
  CREATED: 201,
  NO_CONTENT: 204,
  OK: 200,
} as const;

const FIRST_PATH_SEGMENT = 0;

function assertEmailAvailable(email: string): void {
  const existingUser = [...users.values()].find((existing) => existing.email === email);
  if (existingUser) {
    throw new ValidationError("Email must be unique", [
      { field: "email", message: "Email must be unique", value: email },
    ]);
  }
}

export const userHandlers = {
  create: async ({ body }: { body: { name: string; email: string } }) => {
    const logger = LoggerFacade.getLogger("userHandlers.create");
    logger.info("Creating new user", { body });

    // Validate request body
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

    // Check for duplicate email
    assertEmailAvailable(userData.email);

    // Create user
    const id = randomUUID();
    const user: User = {
      id,
      ...userData,
      createdAt: new Date(),
    };

    users.set(id, user);

    logger.info("User created successfully", { userId: id });
    return {
      body: {
        data: toUserResponse(user),
      },
      status: HttpStatus.CREATED,
    };
  },
  delete: async ({ params }: { params: { id: string } }) => {
    const logger = LoggerFacade.getLogger("userHandlers.delete");
    const { id } = params;
    logger.info("Deleting user", { userId: id });

    const user = users.get(id);
    if (!user) {
      throw new NotFoundError("User", id);
    }

    users.delete(id);

    logger.info("User deleted successfully", { userId: id });
    return {
      body: null,
      status: HttpStatus.NO_CONTENT,
    };
  },
  get: async ({ params }: { params: { id: string } }) => {
    const logger = LoggerFacade.getLogger("userHandlers.get");
    const { id } = params;
    logger.info("Fetching user", { userId: id });

    const user = users.get(id);
    if (!user) {
      throw new NotFoundError("User", id);
    }

    return {
      body: {
        data: toUserResponse(user),
      },
      status: HttpStatus.OK,
    };
  },
  list: async (_args: { req: Request }) => {
    const logger = LoggerFacade.getLogger("userHandlers.list");
    logger.info("Listing all users");

    const userList = [...users.values()].map((user) => toUserResponse(user));
    return {
      body: {
        data: {
          total: userList.length,
          users: userList,
        },
      },
      status: HttpStatus.OK,
    };
  },
  update: async ({
    params,
    body,
  }: {
    params: { id: string };
    body: { name?: string; email?: string };
  }) => {
    const logger = LoggerFacade.getLogger("userHandlers.update");
    const { id } = params;
    logger.info("Updating user", { body, userId: id });

    const user = users.get(id);
    if (!user) {
      throw new NotFoundError("User", id);
    }

    // Validate request body
    const result = UpdateUserSchema.safeParse(body);
    if (!result.success) {
      const validationErrors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      throw new ValidationError("Invalid update data", validationErrors);
    }

    const updates = result.data;

    // Check for duplicate email if email is being updated
    if (updates.email && updates.email !== user.email) {
      assertEmailAvailable(updates.email);
    }

    // Update user
    const updatedUser = {
      ...user,
      ...updates,
    };

    users.set(id, updatedUser);

    logger.info("User updated successfully", { userId: id });
    return {
      body: {
        data: toUserResponse(updatedUser),
      },
      status: HttpStatus.OK,
    };
  },
};
