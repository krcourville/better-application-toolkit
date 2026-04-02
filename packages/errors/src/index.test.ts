import { describe, expect, it } from "vite-plus/test";
import {
  AppError,
  BadGatewayError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  GatewayTimeoutError,
  InternalServerError,
  NotFoundError,
  NotImplementedError,
  ServiceUnavailableError,
  TooManyRequestsError,
  UnauthorizedError,
  UnprocessableEntityError,
  ValidationError,
  getErrorCode,
  getStatusCode,
  isAppError,
  isForbiddenError,
  isNotFoundError,
  isOperationalError,
  isUnauthorizedError,
  isValidationError,
} from "./index.js";

describe("@batkit/errors", () => {
  describe("AppError", () => {
    it("should create an error with correct properties", () => {
      const error = new AppError(500, "Something went wrong", "TEST_ERROR");

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe("Something went wrong");
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe("TEST_ERROR");
      expect(error.isOperational).toBe(true);
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it("should auto-generate code from class name", () => {
      const error = new AppError(400, "Bad request");
      expect(error.code).toBe("APP");
    });

    it("should capture stack trace", () => {
      const error = new AppError(500, "Test error");
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("AppError");
    });

    it("should convert to RFC 9457 format", () => {
      const error = new AppError(404, "Not found", "NOT_FOUND");
      const rfc9457 = error.toRFC9457();

      expect(rfc9457.type).toBe("error:not_found");
      expect(rfc9457.title).toBe("AppError");
      expect(rfc9457.status).toBe(404);
      expect(rfc9457.detail).toBe("Not found");
    });

    it("should include details in RFC 9457 output", () => {
      const error = new AppError(400, "Invalid input", "VALIDATION", {
        field: "email",
        value: "invalid",
      });
      const rfc9457 = error.toRFC9457();

      expect(rfc9457).toHaveProperty("field", "email");
      expect(rfc9457).toHaveProperty("value", "invalid");
    });

    it("should convert to JSON", () => {
      const error = new AppError(500, "Server error", "SERVER_ERROR", {
        foo: "bar",
      });
      const json = error.toJSON();

      expect(json.name).toBe("AppError");
      expect(json.message).toBe("Server error");
      expect(json.code).toBe("SERVER_ERROR");
      expect(json.statusCode).toBe(500);
      expect(json.details).toEqual({ foo: "bar" });
      expect(json.timestamp).toBeDefined();
    });
  });

  describe("BadRequestError", () => {
    it("should create 400 error", () => {
      const error = new BadRequestError("Invalid request");

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("Invalid request");
      expect(error.code).toBe("BAD_REQUEST");
    });

    it("should use default message", () => {
      const error = new BadRequestError();
      expect(error.message).toBe("Bad Request");
    });
  });

  describe("ValidationError", () => {
    it("should require validation errors", () => {
      const validationErrors = [
        { field: "email", message: "Invalid email format" },
        { field: "age", message: "Must be positive", value: -5 },
      ];
      const error = new ValidationError("Validation failed", validationErrors);

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.validationErrors).toEqual(validationErrors);
      expect(error.details).toHaveProperty("validationErrors");
    });

    it("should include validation errors in RFC 9457 output", () => {
      const validationErrors = [{ field: "email", message: "Required" }];
      const error = new ValidationError("Validation failed", validationErrors);
      const rfc9457 = error.toRFC9457();

      expect(rfc9457).toEqual({
        type: "error:validation",
        title: "Validation Error",
        status: 400,
        detail: "Validation failed",
        validationErrors,
      });
    });
  });

  describe("UnauthorizedError", () => {
    it("should create 401 error", () => {
      const error = new UnauthorizedError("Invalid token");

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe("Invalid token");
      expect(error.code).toBe("UNAUTHORIZED");
    });

    it("should use default message", () => {
      const error = new UnauthorizedError();
      expect(error.message).toBe("Unauthorized");
    });
  });

  describe("ForbiddenError", () => {
    it("should create 403 error", () => {
      const error = new ForbiddenError("Access denied", "users", "delete");

      expect(error.statusCode).toBe(403);
      expect(error.message).toBe("Access denied");
      expect(error.code).toBe("FORBIDDEN");
      expect(error.resource).toBe("users");
      expect(error.action).toBe("delete");
    });

    it("should work without resource and action", () => {
      const error = new ForbiddenError();
      expect(error.message).toBe("Forbidden");
      expect(error.resource).toBeUndefined();
      expect(error.action).toBeUndefined();
    });
  });

  describe("NotFoundError", () => {
    it("should require entity name and ID", () => {
      const error = new NotFoundError("User", "123");

      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("User with id '123' was not found");
      expect(error.code).toBe("NOT_FOUND");
      expect(error.entityName).toBe("User");
      expect(error.entityId).toBe("123");
    });

    it("should work with numeric IDs", () => {
      const error = new NotFoundError("Product", 456);

      expect(error.message).toBe("Product with id '456' was not found");
      expect(error.entityId).toBe(456);
    });

    it("should include entity info in RFC 9457 output", () => {
      const error = new NotFoundError("Order", 789);
      const rfc9457 = error.toRFC9457();

      expect(rfc9457).toEqual({
        type: "error:not-found",
        title: "Resource Not Found",
        status: 404,
        detail: "Order with id '789' was not found",
        entityName: "Order",
        entityId: 789,
      });
    });
  });

  describe("ConflictError", () => {
    it("should create 409 error", () => {
      const error = new ConflictError("Email already exists", "User", "user@example.com");

      expect(error.statusCode).toBe(409);
      expect(error.message).toBe("Email already exists");
      expect(error.code).toBe("CONFLICT");
      expect(error.conflictingResource).toBe("User");
      expect(error.conflictingId).toBe("user@example.com");
    });
  });

  describe("UnprocessableEntityError", () => {
    it("should create 422 error", () => {
      const error = new UnprocessableEntityError("Cannot process payment");

      expect(error.statusCode).toBe(422);
      expect(error.code).toBe("UNPROCESSABLE_ENTITY");
    });
  });

  describe("TooManyRequestsError", () => {
    it("should create 429 error with retry info", () => {
      const error = new TooManyRequestsError("Rate limit exceeded", 60, 100);

      expect(error.statusCode).toBe(429);
      expect(error.code).toBe("TOO_MANY_REQUESTS");
      expect(error.retryAfter).toBe(60);
      expect(error.limit).toBe(100);
    });

    it("should include retry info in RFC 9457 output", () => {
      const error = new TooManyRequestsError("Rate limit", 30, 50);
      const rfc9457 = error.toRFC9457();

      expect(rfc9457).toEqual({
        type: "error:too-many-requests",
        title: "Too Many Requests",
        status: 429,
        detail: "Rate limit",
        retryAfter: 30,
        limit: 50,
      });
    });

    it("should work without retry info", () => {
      const error = new TooManyRequestsError();
      expect(error.message).toBe("Too Many Requests");
      const rfc9457 = error.toRFC9457();
      expect(rfc9457).not.toHaveProperty("retryAfter");
    });
  });

  describe("InternalServerError", () => {
    it("should create 500 error", () => {
      const error = new InternalServerError("Database connection failed");

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe("INTERNAL_SERVER_ERROR");
    });

    it("should use default message", () => {
      const error = new InternalServerError();
      expect(error.message).toBe("Internal Server Error");
    });
  });

  describe("NotImplementedError", () => {
    it("should create 501 error", () => {
      const error = new NotImplementedError("Feature not available", "GraphQL");

      expect(error.statusCode).toBe(501);
      expect(error.code).toBe("NOT_IMPLEMENTED");
      expect(error.details).toHaveProperty("feature", "GraphQL");
    });
  });

  describe("BadGatewayError", () => {
    it("should create 502 error", () => {
      const error = new BadGatewayError("Upstream error", "payment-service");

      expect(error.statusCode).toBe(502);
      expect(error.code).toBe("BAD_GATEWAY");
      expect(error.details).toHaveProperty("upstream", "payment-service");
    });
  });

  describe("ServiceUnavailableError", () => {
    it("should create 503 error with retry after", () => {
      const error = new ServiceUnavailableError("Maintenance mode", 3600);

      expect(error.statusCode).toBe(503);
      expect(error.code).toBe("SERVICE_UNAVAILABLE");
      expect(error.retryAfter).toBe(3600);
    });

    it("should include retry in RFC 9457 output", () => {
      const error = new ServiceUnavailableError("Down for maintenance", 1800);
      const rfc9457 = error.toRFC9457();

      expect(rfc9457).toEqual({
        type: "error:service-unavailable",
        title: "Service Unavailable",
        status: 503,
        detail: "Down for maintenance",
        retryAfter: 1800,
      });
    });
  });

  describe("GatewayTimeoutError", () => {
    it("should create 504 error", () => {
      const error = new GatewayTimeoutError("Timeout", "api-service", 30000);

      expect(error.statusCode).toBe(504);
      expect(error.code).toBe("GATEWAY_TIMEOUT");
      expect(error.details).toHaveProperty("upstream", "api-service");
      expect(error.details).toHaveProperty("timeout", 30000);
    });
  });

  describe("Type Guards", () => {
    describe("isAppError", () => {
      it("should return true for AppError instances", () => {
        expect(isAppError(new AppError(500, "Error"))).toBe(true);
        expect(isAppError(new NotFoundError("User", "123"))).toBe(true);
        expect(isAppError(new ValidationError("Invalid", []))).toBe(true);
      });

      it("should return false for non-AppError", () => {
        expect(isAppError(new Error("Regular error"))).toBe(false);
        expect(isAppError("string")).toBe(false);
        expect(isAppError(null)).toBe(false);
        expect(isAppError(undefined)).toBe(false);
      });
    });

    describe("isOperationalError", () => {
      it("should return true for operational errors", () => {
        expect(isOperationalError(new NotFoundError("User", "123"))).toBe(true);
        expect(isOperationalError(new ValidationError("Bad", []))).toBe(true);
      });

      it("should return false for non-operational errors", () => {
        const nonOperational = new AppError(500, "Bug", "BUG", {}, false);
        expect(isOperationalError(nonOperational)).toBe(false);
        expect(isOperationalError(new Error("Regular"))).toBe(false);
      });
    });

    describe("isValidationError", () => {
      it("should identify validation errors", () => {
        const error = new ValidationError("Invalid", [{ field: "email", message: "Bad" }]);
        expect(isValidationError(error)).toBe(true);
      });

      it("should return false for other errors", () => {
        expect(isValidationError(new NotFoundError("User", "1"))).toBe(false);
        expect(isValidationError(new Error("Regular"))).toBe(false);
      });
    });

    describe("isNotFoundError", () => {
      it("should identify not found errors", () => {
        expect(isNotFoundError(new NotFoundError("User", "123"))).toBe(true);
      });

      it("should return false for other errors", () => {
        expect(isNotFoundError(new ValidationError("Bad", []))).toBe(false);
      });
    });

    describe("isUnauthorizedError", () => {
      it("should identify unauthorized errors", () => {
        expect(isUnauthorizedError(new UnauthorizedError())).toBe(true);
      });

      it("should return false for other errors", () => {
        expect(isUnauthorizedError(new ForbiddenError())).toBe(false);
      });
    });

    describe("isForbiddenError", () => {
      it("should identify forbidden errors", () => {
        expect(isForbiddenError(new ForbiddenError())).toBe(true);
      });

      it("should return false for other errors", () => {
        expect(isForbiddenError(new UnauthorizedError())).toBe(false);
      });
    });
  });

  describe("Utility Functions", () => {
    describe("getStatusCode", () => {
      it("should extract status code from AppError", () => {
        expect(getStatusCode(new NotFoundError("User", "1"))).toBe(404);
        expect(getStatusCode(new ValidationError("Bad", []))).toBe(400);
        expect(getStatusCode(new InternalServerError())).toBe(500);
      });

      it("should return 500 for non-AppError", () => {
        expect(getStatusCode(new Error("Regular"))).toBe(500);
        expect(getStatusCode("string")).toBe(500);
        expect(getStatusCode(null)).toBe(500);
      });
    });

    describe("getErrorCode", () => {
      it("should extract error code from AppError", () => {
        expect(getErrorCode(new NotFoundError("User", "1"))).toBe("NOT_FOUND");
        expect(getErrorCode(new ValidationError("Bad", []))).toBe("VALIDATION_ERROR");
      });

      it("should return UNKNOWN_ERROR for regular Error", () => {
        expect(getErrorCode(new Error("Regular"))).toBe("UNKNOWN_ERROR");
      });

      it("should return UNKNOWN for non-Error", () => {
        expect(getErrorCode("string")).toBe("UNKNOWN");
        expect(getErrorCode(null)).toBe("UNKNOWN");
      });
    });
  });

  describe("Error inheritance", () => {
    it("should maintain instanceof checks through hierarchy", () => {
      const error = new NotFoundError("User", "123");

      expect(error instanceof NotFoundError).toBe(true);
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });

    it("should preserve error name", () => {
      expect(new NotFoundError("User", "1").name).toBe("NotFoundError");
      expect(new ValidationError("Bad", []).name).toBe("ValidationError");
      expect(new UnauthorizedError().name).toBe("UnauthorizedError");
    });
  });
});
