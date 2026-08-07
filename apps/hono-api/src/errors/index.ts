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
import { OpenAPIHono } from "@hono/zod-openapi";
import {
  badRequestRoute,
  conflictRoute,
  forbiddenRoute,
  genericRoute,
  internalRoute,
  notFoundRoute,
  rateLimitRoute,
  serviceUnavailableRoute,
  unauthorizedRoute,
  validationRoute,
} from "./contract.js";
import { validationHook } from "../lib/validation-hook.js";

const RATE_LIMIT_RETRY_AFTER_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 100;
const MAINTENANCE_RETRY_AFTER_SECONDS = 3600;

export const errorsApp = new OpenAPIHono({ defaultHook: validationHook })
  .openapi(badRequestRoute, () => {
    throw new BadRequestError("This is a bad request error example");
  })
  .openapi(conflictRoute, () => {
    throw new ConflictError("Resource already exists", "User", "user@example.com");
  })
  .openapi(forbiddenRoute, () => {
    throw new ForbiddenError(
      "You do not have permission to access this resource",
      "admin-panel",
      "view",
    );
  })
  .openapi(genericRoute, () => {
    throw new Error("This is a generic JavaScript error");
  })
  .openapi(internalRoute, () => {
    throw new InternalServerError("Simulated internal server error");
  })
  .openapi(notFoundRoute, () => {
    throw new NotFoundError("Product", "999");
  })
  .openapi(rateLimitRoute, () => {
    throw new TooManyRequestsError(
      "Too many requests, please try again later",
      RATE_LIMIT_RETRY_AFTER_SECONDS,
      RATE_LIMIT_MAX_REQUESTS,
    );
  })
  .openapi(serviceUnavailableRoute, () => {
    throw new ServiceUnavailableError(
      "Service is temporarily unavailable for maintenance",
      MAINTENANCE_RETRY_AFTER_SECONDS,
    );
  })
  .openapi(unauthorizedRoute, () => {
    throw new UnauthorizedError("Invalid API token provided");
  })
  .openapi(validationRoute, () => {
    throw new ValidationError("Validation failed", [
      {
        field: "email",
        message: "Must be a valid email address",
        value: "invalid-email",
      },
      { field: "age", message: "Must be at least 18", value: 15 },
      { field: "password", message: "Must be at least 8 characters" },
    ]);
  });
