import { describe, expect, it } from "vite-plus/test";
import {
  type ExtendedProblemDetails,
  PROBLEM_DETAILS_CONTENT_TYPE,
  type ProblemDetails,
  ProblemDetailsSchema,
  createExtendedProblemDetails,
  createProblemDetails,
  createProblemDetailsHeaders,
  isProblemDetails,
  validateExtendedProblemDetails,
  validateProblemDetails,
} from "./index.js";

describe("@batkit/rfc9457", () => {
  describe("ProblemDetailsSchema", () => {
    it("should validate a minimal problem details object", () => {
      const result = ProblemDetailsSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("about:blank");
      }
    });

    it("should validate a complete problem details object", () => {
      const problemDetails = {
        detail: "The requested resource was not found",
        instance: "/users/123",
        status: 404,
        title: "Resource Not Found",
        type: "https://example.com/errors/not-found",
      };

      const result = ProblemDetailsSchema.safeParse(problemDetails);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ ...problemDetails });
      }
    });

    it("should reject invalid status codes", () => {
      const invalidStatus = { status: 999 };
      const result = ProblemDetailsSchema.safeParse(invalidStatus);
      expect(result.success).toBe(false);
    });

    it("should reject non-integer status codes", () => {
      const invalidStatus = { status: 404.5 };
      const result = ProblemDetailsSchema.safeParse(invalidStatus);
      expect(result.success).toBe(false);
    });

    it("should accept valid status code range", () => {
      const httpStatusMin = 100;
      const ok = 200;
      const notFound = 404;
      const internalServerError = 500;
      const httpStatusMax = 599;
      const validStatuses = [httpStatusMin, ok, notFound, internalServerError, httpStatusMax];
      for (const status of validStatuses) {
        const result = ProblemDetailsSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("validateProblemDetails", () => {
    it("should validate valid problem details", () => {
      const result = validateProblemDetails({
        detail: "You do not have permission to access this resource",
        status: 403,
        title: "Forbidden",
        type: "https://example.com/errors/forbidden",
      });

      expect(result.success).toBe(true);
    });

    it("should reject invalid problem details", () => {
      const result = validateProblemDetails({
        status: "not-a-number",
      });

      expect(result.success).toBe(false);
    });

    it("should provide error details for invalid data", () => {
      // Invalid status code
      const result = validateProblemDetails({
        status: 1000,
      });

      const noIssues = 0;
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(noIssues);
      }
    });
  });

  describe("validateExtendedProblemDetails", () => {
    it("should allow additional properties", () => {
      const extendedDetails = {
        errors: [
          { field: "email", message: "Invalid email format" },
          { field: "password", message: "Password too short" },
        ],
        status: 400,
        title: "Validation Error",
        type: "https://example.com/errors/validation",
      };

      const result = validateExtendedProblemDetails(extendedDetails);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(extendedDetails);
      }
    });

    it("should validate core RFC 9457 fields", () => {
      const result = validateExtendedProblemDetails({
        customField: "allowed",
        status: "invalid",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("createProblemDetails", () => {
    it("should create problem details with defaults", () => {
      const notFoundStatus = 404;
      const problem = createProblemDetails({
        status: notFoundStatus,
        title: "Not Found",
      });

      expect(problem.type).toBe("about:blank");
      expect(problem.status).toBe(notFoundStatus);
      expect(problem.title).toBe("Not Found");
    });

    it("should allow overriding type", () => {
      const problem = createProblemDetails({
        status: 404,
        type: "https://example.com/errors/not-found",
      });

      expect(problem.type).toBe("https://example.com/errors/not-found");
    });

    it("should create complete problem details", () => {
      const problem = createProblemDetails({
        detail: "Invalid authentication token",
        instance: "/api/users/me",
        status: 401,
        title: "Unauthorized",
        type: "https://example.com/errors/unauthorized",
      });

      expect(problem).toEqual({
        detail: "Invalid authentication token",
        instance: "/api/users/me",
        status: 401,
        title: "Unauthorized",
        type: "https://example.com/errors/unauthorized",
      });
    });

    it("should require status field", () => {
      expect(() => createProblemDetails({})).toThrow();
    });
  });

  describe("createExtendedProblemDetails", () => {
    it("should create extended problem details with custom fields", () => {
      const problem = createExtendedProblemDetails({
        requestId: "req-123",
        status: 400,
        title: "Validation Error",
        type: "https://example.com/errors/validation",
        validationErrors: [{ field: "email", message: "Invalid format" }],
      });

      expect(problem).toEqual({
        requestId: "req-123",
        status: 400,
        title: "Validation Error",
        type: "https://example.com/errors/validation",
        validationErrors: [{ field: "email", message: "Invalid format" }],
      });
    });

    it("should maintain type safety for custom fields", () => {
      interface ValidationProblem extends Record<string, unknown> {
        validationErrors: { field: string; message: string }[];
      }

      const problem = createExtendedProblemDetails<ValidationProblem>({
        status: 400,
        validationErrors: [{ field: "email", message: "Required" }],
      });

      const firstError = 0;
      // TypeScript should know about validationErrors
      expect(problem.validationErrors).toBeDefined();
      expect(problem.validationErrors[firstError]?.field).toBe("email");
    });
  });

  describe("createProblemDetailsHeaders", () => {
    it("should create headers with correct content type", () => {
      const headers = createProblemDetailsHeaders();
      expect(headers["Content-Type"]).toBe(PROBLEM_DETAILS_CONTENT_TYPE);
    });

    it("should include additional headers", () => {
      const headers = createProblemDetailsHeaders({
        "Cache-Control": "no-cache",
        "X-Request-Id": "req-123",
      });

      expect(headers["Content-Type"]).toBe(PROBLEM_DETAILS_CONTENT_TYPE);
      expect(headers["Cache-Control"]).toBe("no-cache");
      expect(headers["X-Request-Id"]).toBe("req-123");
    });

    it("should not allow overriding content type", () => {
      const headers = createProblemDetailsHeaders({
        "Content-Type": "application/json",
      });

      expect(headers["Content-Type"]).toBe(PROBLEM_DETAILS_CONTENT_TYPE);
    });
  });

  describe("isProblemDetails", () => {
    it("should return true for valid problem details", () => {
      const valid: ProblemDetails = {
        status: 500,
        title: "Internal Server Error",
        type: "about:blank",
      };

      expect(isProblemDetails(valid)).toBe(true);
    });

    it("should return false for invalid objects", () => {
      expect(isProblemDetails(null)).toBe(false);
      expect(isProblemDetails()).toBe(false);
      // Empty object is valid (all fields optional)
      expect(isProblemDetails({})).toBe(true);
      expect(isProblemDetails({ status: "invalid" })).toBe(false);
      expect(isProblemDetails("string")).toBe(false);
      const notAnObject = 123;
      expect(isProblemDetails(notAnObject)).toBe(false);
    });

    it("should narrow type when used as type guard", () => {
      const notFoundStatus = 404;
      const maybeProb: unknown = {
        status: notFoundStatus,
        type: "about:blank",
      };

      if (isProblemDetails(maybeProb)) {
        // TypeScript should know this is ProblemDetails
        expect(maybeProb.status).toBe(notFoundStatus);
      }
    });
  });

  describe("TypeScript types", () => {
    it("should export ProblemDetails type", () => {
      const problem: ProblemDetails = {
        status: 404,
        type: "about:blank",
      };

      expect(problem).toBeDefined();
    });

    it("should export ExtendedProblemDetails type", () => {
      const problem: ExtendedProblemDetails = {
        customField: "value",
        status: 400,
        type: "about:blank",
      };

      expect(problem.customField).toBe("value");
    });
  });

  describe("RFC 9457 compliance", () => {
    it("should use about:blank as default type", () => {
      const problem = createProblemDetails({ status: 500 });
      expect(problem.type).toBe("about:blank");
    });

    it("should support all standard fields", () => {
      const problem: ProblemDetails = {
        detail: "Your current balance is 30, but that costs 50.",
        instance: "/account/12345/msgs/abc",
        status: 403,
        title: "You do not have enough credit.",
        type: "https://example.com/probs/out-of-credit",
      };

      expect(validateProblemDetails(problem).success).toBe(true);
    });

    it("should allow extension members", () => {
      const problem = createExtendedProblemDetails({
        accounts: ["/account/12345", "/account/67890"],
        balance: 30,
        status: 403,
        type: "https://example.com/probs/out-of-credit",
      });

      expect(problem).toEqual({
        accounts: ["/account/12345", "/account/67890"],
        balance: 30,
        status: 403,
        type: "https://example.com/probs/out-of-credit",
      });
    });
  });
});
