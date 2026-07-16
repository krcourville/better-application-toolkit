import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  ServiceUnavailableError,
  TooManyRequestsError,
  UnauthorizedError,
  ValidationError,
} from "@batkit/errors";

const RATE_LIMIT_RETRY_AFTER_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 100;
const MAINTENANCE_RETRY_AFTER_SECONDS = 3600;

export const errorHandlers = {
  badRequest: async () => {
    throw new BadRequestError("This is a bad request error example");
  },
  conflict: async () => {
    throw new ConflictError("Resource already exists", "User", "user@example.com");
  },
  forbidden: async () => {
    throw new ForbiddenError(
      "You do not have permission to access this resource",
      "admin-panel",
      "view",
    );
  },
  generic: async () => {
    throw new Error("This is a generic JavaScript error");
  },
  internal: async () => {
    throw new InternalServerError("Simulated internal server error");
  },
  notFound: async () => {
    throw new NotFoundError("Product", "999");
  },
  rateLimit: async () => {
    throw new TooManyRequestsError(
      "Too many requests, please try again later",
      RATE_LIMIT_RETRY_AFTER_SECONDS,
      RATE_LIMIT_MAX_REQUESTS,
    );
  },
  serviceUnavailable: async () => {
    throw new ServiceUnavailableError(
      "Service is temporarily unavailable for maintenance",
      MAINTENANCE_RETRY_AFTER_SECONDS,
    );
  },
  unauthorized: async () => {
    throw new UnauthorizedError("Invalid API token provided");
  },
  validation: async () => {
    throw new ValidationError("Validation failed", [
      {
        field: "email",
        message: "Must be a valid email address",
        value: "invalid-email",
      },
      { field: "age", message: "Must be at least 18", value: 15 },
      { field: "password", message: "Must be at least 8 characters" },
    ]);
  },
};
