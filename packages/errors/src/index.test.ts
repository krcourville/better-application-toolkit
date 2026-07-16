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

const HttpStatus = {
  BAD_GATEWAY: 502,
  BAD_REQUEST: 400,
  CONFLICT: 409,
  FORBIDDEN: 403,
  GATEWAY_TIMEOUT: 504,
  INTERNAL_SERVER_ERROR: 500,
  NOT_FOUND: 404,
  NOT_IMPLEMENTED: 501,
  SERVICE_UNAVAILABLE: 503,
  TOO_MANY_REQUESTS: 429,
  UNAUTHORIZED: 401,
  UNPROCESSABLE_ENTITY: 422,
} as const;

describe("@batkit/errors", () => {
  describe("AppError", () => {
    it("should create an error with correct properties", () => {
      const error = new AppError(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong", {
        code: "TEST_ERROR",
      });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe("Something went wrong");
      expect(error.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(error.code).toBe("TEST_ERROR");
      expect(error.isOperational).toBe(true);
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it("should auto-generate code from class name", () => {
      const error = new AppError(HttpStatus.BAD_REQUEST, "Bad request");
      expect(error.code).toBe("APP");
    });

    it("should capture stack trace", () => {
      const error = new AppError(HttpStatus.INTERNAL_SERVER_ERROR, "Test error");
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("AppError");
    });

    it("should convert to RFC 9457 format", () => {
      const error = new AppError(HttpStatus.NOT_FOUND, "Not found", { code: "NOT_FOUND" });
      const rfc9457 = error.toRFC9457();

      expect(rfc9457.type).toBe("error:not_found");
      expect(rfc9457.title).toBe("AppError");
      expect(rfc9457.status).toBe(HttpStatus.NOT_FOUND);
      expect(rfc9457.detail).toBe("Not found");
    });

    it("should include details in RFC 9457 output", () => {
      const error = new AppError(HttpStatus.BAD_REQUEST, "Invalid input", {
        code: "VALIDATION",
        details: { field: "email", value: "invalid" },
      });
      const rfc9457 = error.toRFC9457();

      expect(rfc9457).toHaveProperty("field", "email");
      expect(rfc9457).toHaveProperty("value", "invalid");
    });

    it("should convert to JSON", () => {
      const error = new AppError(HttpStatus.INTERNAL_SERVER_ERROR, "Server error", {
        code: "SERVER_ERROR",
        details: { foo: "bar" },
      });
      const json = error.toJSON();

      expect(json.name).toBe("AppError");
      expect(json.message).toBe("Server error");
      expect(json.code).toBe("SERVER_ERROR");
      expect(json.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(json.details).toEqual({ foo: "bar" });
      expect(json.timestamp).toBeDefined();
    });
  });

  describe("BadRequestError", () => {
    it("should create 400 error", () => {
      const error = new BadRequestError("Invalid request");

      expect(error.statusCode).toBe(HttpStatus.BAD_REQUEST);
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

      expect(error.statusCode).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.validationErrors).toEqual(validationErrors);
      expect(error.details).toHaveProperty("validationErrors");
    });

    it("should include validation errors in RFC 9457 output", () => {
      const validationErrors = [{ field: "email", message: "Required" }];
      const error = new ValidationError("Validation failed", validationErrors);
      const rfc9457 = error.toRFC9457();

      expect(rfc9457).toEqual({
        detail: "Validation failed",
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        title: "Validation Error",
        type: "error:validation",
        validationErrors,
      });
    });
  });

  describe("UnauthorizedError", () => {
    it("should create 401 error", () => {
      const error = new UnauthorizedError("Invalid token");

      expect(error.statusCode).toBe(HttpStatus.UNAUTHORIZED);
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

      expect(error.statusCode).toBe(HttpStatus.FORBIDDEN);
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

      expect(error.statusCode).toBe(HttpStatus.NOT_FOUND);
      expect(error.message).toBe("User with id '123' was not found");
      expect(error.code).toBe("NOT_FOUND");
      expect(error.entityName).toBe("User");
      expect(error.entityId).toBe("123");
    });

    it("should work with numeric IDs", () => {
      const productId = 456;
      const error = new NotFoundError("Product", productId);

      expect(error.message).toBe("Product with id '456' was not found");
      expect(error.entityId).toBe(productId);
    });

    it("should include entity info in RFC 9457 output", () => {
      const orderId = 789;
      const error = new NotFoundError("Order", orderId);
      const rfc9457 = error.toRFC9457();

      expect(rfc9457).toEqual({
        detail: "Order with id '789' was not found",
        entityId: orderId,
        entityName: "Order",
        status: HttpStatus.NOT_FOUND,
        title: "Resource Not Found",
        type: "error:not-found",
      });
    });
  });

  describe("ConflictError", () => {
    it("should create 409 error", () => {
      const error = new ConflictError("Email already exists", "User", "user@example.com");

      expect(error.statusCode).toBe(HttpStatus.CONFLICT);
      expect(error.message).toBe("Email already exists");
      expect(error.code).toBe("CONFLICT");
      expect(error.conflictingResource).toBe("User");
      expect(error.conflictingId).toBe("user@example.com");
    });
  });

  describe("UnprocessableEntityError", () => {
    it("should create 422 error", () => {
      const error = new UnprocessableEntityError("Cannot process payment");

      expect(error.statusCode).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(error.code).toBe("UNPROCESSABLE_ENTITY");
    });
  });

  describe("TooManyRequestsError", () => {
    it("should create 429 error with retry info", () => {
      const retryAfterSeconds = 60;
      const maxRequests = 100;
      const error = new TooManyRequestsError("Rate limit exceeded", retryAfterSeconds, maxRequests);

      expect(error.statusCode).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(error.code).toBe("TOO_MANY_REQUESTS");
      expect(error.retryAfter).toBe(retryAfterSeconds);
      expect(error.limit).toBe(maxRequests);
    });

    it("should include retry info in RFC 9457 output", () => {
      const retryAfterSeconds = 30;
      const maxRequests = 50;
      const error = new TooManyRequestsError("Rate limit", retryAfterSeconds, maxRequests);
      const rfc9457 = error.toRFC9457();

      expect(rfc9457).toEqual({
        detail: "Rate limit",
        limit: maxRequests,
        retryAfter: retryAfterSeconds,
        status: HttpStatus.TOO_MANY_REQUESTS,
        title: "Too Many Requests",
        type: "error:too-many-requests",
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

      expect(error.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
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

      expect(error.statusCode).toBe(HttpStatus.NOT_IMPLEMENTED);
      expect(error.code).toBe("NOT_IMPLEMENTED");
      expect(error.details).toHaveProperty("feature", "GraphQL");
    });
  });

  describe("BadGatewayError", () => {
    it("should create 502 error", () => {
      const error = new BadGatewayError("Upstream error", "payment-service");

      expect(error.statusCode).toBe(HttpStatus.BAD_GATEWAY);
      expect(error.code).toBe("BAD_GATEWAY");
      expect(error.details).toHaveProperty("upstream", "payment-service");
    });
  });

  describe("ServiceUnavailableError", () => {
    it("should create 503 error with retry after", () => {
      const retryAfterSeconds = 3600;
      const error = new ServiceUnavailableError("Maintenance mode", retryAfterSeconds);

      expect(error.statusCode).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(error.code).toBe("SERVICE_UNAVAILABLE");
      expect(error.retryAfter).toBe(retryAfterSeconds);
    });

    it("should include retry in RFC 9457 output", () => {
      const retryAfterSeconds = 1800;
      const error = new ServiceUnavailableError("Down for maintenance", retryAfterSeconds);
      const rfc9457 = error.toRFC9457();

      expect(rfc9457).toEqual({
        detail: "Down for maintenance",
        retryAfter: retryAfterSeconds,
        status: HttpStatus.SERVICE_UNAVAILABLE,
        title: "Service Unavailable",
        type: "error:service-unavailable",
      });
    });
  });

  describe("GatewayTimeoutError", () => {
    it("should create 504 error", () => {
      const timeoutMs = 30_000;
      const error = new GatewayTimeoutError("Timeout", "api-service", timeoutMs);

      expect(error.statusCode).toBe(HttpStatus.GATEWAY_TIMEOUT);
      expect(error.code).toBe("GATEWAY_TIMEOUT");
      expect(error.details).toHaveProperty("upstream", "api-service");
      expect(error.details).toHaveProperty("timeout", timeoutMs);
    });
  });

  describe("Type Guards", () => {
    describe("isAppError", () => {
      it("should return true for AppError instances", () => {
        expect(isAppError(new AppError(HttpStatus.INTERNAL_SERVER_ERROR, "Error"))).toBe(true);
        expect(isAppError(new NotFoundError("User", "123"))).toBe(true);
        expect(isAppError(new ValidationError("Invalid", []))).toBe(true);
      });

      it("should return false for non-AppError", () => {
        expect(isAppError(new Error("Regular error"))).toBe(false);
        expect(isAppError("string")).toBe(false);
        expect(isAppError(null)).toBe(false);
        expect(isAppError()).toBe(false);
      });
    });

    describe("isOperationalError", () => {
      it("should return true for operational errors", () => {
        expect(isOperationalError(new NotFoundError("User", "123"))).toBe(true);
        expect(isOperationalError(new ValidationError("Bad", []))).toBe(true);
      });

      it("should return false for non-operational errors", () => {
        const nonOperational = new AppError(HttpStatus.INTERNAL_SERVER_ERROR, "Bug", {
          code: "BUG",
          isOperational: false,
        });
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
        expect(getStatusCode(new NotFoundError("User", "1"))).toBe(HttpStatus.NOT_FOUND);
        expect(getStatusCode(new ValidationError("Bad", []))).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(getStatusCode(new InternalServerError())).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      });

      it("should return 500 for non-AppError", () => {
        expect(getStatusCode(new Error("Regular"))).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(getStatusCode("string")).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(getStatusCode(null)).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
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
