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

const users = new Map<string, User>();

// Initialize with sample data
users.set("1", {
  id: "1",
  name: "John Doe",
  email: "john@example.com",
  createdAt: new Date("2026-01-01"),
});
users.set("2", {
  id: "2",
  name: "Jane Smith",
  email: "jane@example.com",
  createdAt: new Date("2026-01-15"),
});

const toUserResponse = (user: User) => ({
  ...user,
  createdAt: user.createdAt.toISOString(),
});

export const userHandlers = {
  list: async (_: { req: Request }) => {
    const logger = LoggerFacade.getLogger("userHandlers.list");
    logger.info("Listing all users");

    const userList = Array.from(users.values()).map(toUserResponse);
    return {
      status: 200 as const,
      body: {
        data: {
          users: userList,
          total: userList.length,
        },
      },
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
      status: 200 as const,
      body: {
        data: toUserResponse(user),
      },
    };
  },
  create: async ({ body }: { body: { name: string; email: string } }) => {
    const logger = LoggerFacade.getLogger("userHandlers.create");
    logger.info("Creating new user", { body });

    // Validate request body
    const result = CreateUserSchema.safeParse(body);
    if (!result.success) {
      const validationErrors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        value: body[issue.path[0] as "name" | "email"],
      }));
      throw new ValidationError("Invalid user data", validationErrors);
    }

    const userData = result.data;

    // Check for duplicate email
    const existingUser = Array.from(users.values()).find(
      (u) => u.email === userData.email
    );
    if (existingUser) {
      throw new ValidationError("User with this email already exists", [
        {
          field: "email",
          message: "Email must be unique",
          value: userData.email,
        },
      ]);
    }

    // Create user
    const id = String(users.size + 1);
    const user: User = {
      id,
      ...userData,
      createdAt: new Date(),
    };

    users.set(id, user);

    logger.info("User created successfully", { userId: id });
    return {
      status: 201 as const,
      body: {
        data: toUserResponse(user),
      },
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
    logger.info("Updating user", { userId: id, body });

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
      const existingUser = Array.from(users.values()).find(
        (u) => u.email === updates.email
      );
      if (existingUser) {
        throw new ValidationError("Email already in use", [
          {
            field: "email",
            message: "Email must be unique",
            value: updates.email,
          },
        ]);
      }
    }

    // Update user
    const updatedUser = {
      ...user,
      ...updates,
    };

    users.set(id, updatedUser);

    logger.info("User updated successfully", { userId: id });
    return {
      status: 200 as const,
      body: {
        data: toUserResponse(updatedUser),
      },
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
      status: 204 as const,
      body: null,
    };
  },
};
