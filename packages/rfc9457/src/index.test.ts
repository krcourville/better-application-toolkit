import { describe, expect, it } from 'vitest';
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
} from './index.js';

describe('@batkit/rfc9457', () => {
  describe('ProblemDetailsSchema', () => {
    it('should validate a minimal problem details object', () => {
      const result = ProblemDetailsSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('about:blank');
      }
    });

    it('should validate a complete problem details object', () => {
      const problemDetails = {
        type: 'https://example.com/errors/not-found',
        title: 'Resource Not Found',
        status: 404,
        detail: 'The requested resource was not found',
        instance: '/users/123',
      };

      const result = ProblemDetailsSchema.safeParse(problemDetails);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ ...problemDetails });
      }
    });

    it('should reject invalid status codes', () => {
      const invalidStatus = { status: 999 };
      const result = ProblemDetailsSchema.safeParse(invalidStatus);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer status codes', () => {
      const invalidStatus = { status: 404.5 };
      const result = ProblemDetailsSchema.safeParse(invalidStatus);
      expect(result.success).toBe(false);
    });

    it('should accept valid status code range', () => {
      const validStatuses = [100, 200, 404, 500, 599];
      for (const status of validStatuses) {
        const result = ProblemDetailsSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('validateProblemDetails', () => {
    it('should validate valid problem details', () => {
      const result = validateProblemDetails({
        type: 'https://example.com/errors/forbidden',
        title: 'Forbidden',
        status: 403,
        detail: 'You do not have permission to access this resource',
      });

      expect(result.success).toBe(true);
    });

    it('should reject invalid problem details', () => {
      const result = validateProblemDetails({
        status: 'not-a-number',
      });

      expect(result.success).toBe(false);
    });

    it('should provide error details for invalid data', () => {
      const result = validateProblemDetails({
        status: 1000, // Invalid status code
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe('validateExtendedProblemDetails', () => {
    it('should allow additional properties', () => {
      const extendedDetails = {
        type: 'https://example.com/errors/validation',
        title: 'Validation Error',
        status: 400,
        errors: [
          { field: 'email', message: 'Invalid email format' },
          { field: 'password', message: 'Password too short' },
        ],
      };

      const result = validateExtendedProblemDetails(extendedDetails);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(extendedDetails);
      }
    });

    it('should validate core RFC 9457 fields', () => {
      const result = validateExtendedProblemDetails({
        status: 'invalid',
        customField: 'allowed',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('createProblemDetails', () => {
    it('should create problem details with defaults', () => {
      const problem = createProblemDetails({
        status: 404,
        title: 'Not Found',
      });

      expect(problem.type).toBe('about:blank');
      expect(problem.status).toBe(404);
      expect(problem.title).toBe('Not Found');
    });

    it('should allow overriding type', () => {
      const problem = createProblemDetails({
        type: 'https://example.com/errors/not-found',
        status: 404,
      });

      expect(problem.type).toBe('https://example.com/errors/not-found');
    });

    it('should create complete problem details', () => {
      const problem = createProblemDetails({
        type: 'https://example.com/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'Invalid authentication token',
        instance: '/api/users/me',
      });

      expect(problem).toEqual({
        type: 'https://example.com/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'Invalid authentication token',
        instance: '/api/users/me',
      });
    });

    it('should require status field', () => {
      expect(() => createProblemDetails({})).toThrow();
    });
  });

  describe('createExtendedProblemDetails', () => {
    it('should create extended problem details with custom fields', () => {
      const problem = createExtendedProblemDetails({
        type: 'https://example.com/errors/validation',
        status: 400,
        title: 'Validation Error',
        validationErrors: [{ field: 'email', message: 'Invalid format' }],
        requestId: 'req-123',
      });

      expect(problem).toEqual({
        status: 400,
        title: 'Validation Error',
        type: 'https://example.com/errors/validation',
        validationErrors: [{ field: 'email', message: 'Invalid format' }],
        requestId: 'req-123',
      });
    });

    it('should maintain type safety for custom fields', () => {
      interface ValidationProblem extends Record<string, unknown> {
        validationErrors: Array<{ field: string; message: string }>;
      }

      const problem = createExtendedProblemDetails<ValidationProblem>({
        status: 400,
        validationErrors: [{ field: 'email', message: 'Required' }],
      });

      // TypeScript should know about validationErrors
      expect(problem.validationErrors).toBeDefined();
      expect(problem.validationErrors[0]?.field).toBe('email');
    });
  });

  describe('createProblemDetailsHeaders', () => {
    it('should create headers with correct content type', () => {
      const headers = createProblemDetailsHeaders();
      expect(headers['Content-Type']).toBe(PROBLEM_DETAILS_CONTENT_TYPE);
    });

    it('should include additional headers', () => {
      const headers = createProblemDetailsHeaders({
        'Cache-Control': 'no-cache',
        'X-Request-Id': 'req-123',
      });

      expect(headers['Content-Type']).toBe(PROBLEM_DETAILS_CONTENT_TYPE);
      expect(headers['Cache-Control']).toBe('no-cache');
      expect(headers['X-Request-Id']).toBe('req-123');
    });

    it('should not allow overriding content type', () => {
      const headers = createProblemDetailsHeaders({
        'Content-Type': 'application/json',
      });

      expect(headers['Content-Type']).toBe(PROBLEM_DETAILS_CONTENT_TYPE);
    });
  });

  describe('isProblemDetails', () => {
    it('should return true for valid problem details', () => {
      const valid: ProblemDetails = {
        type: 'about:blank',
        status: 500,
        title: 'Internal Server Error',
      };

      expect(isProblemDetails(valid)).toBe(true);
    });

    it('should return false for invalid objects', () => {
      expect(isProblemDetails(null)).toBe(false);
      expect(isProblemDetails(undefined)).toBe(false);
      expect(isProblemDetails({})).toBe(true); // Empty object is valid (all fields optional)
      expect(isProblemDetails({ status: 'invalid' })).toBe(false);
      expect(isProblemDetails('string')).toBe(false);
      expect(isProblemDetails(123)).toBe(false);
    });

    it('should narrow type when used as type guard', () => {
      const maybeProb: unknown = {
        type: 'about:blank',
        status: 404,
      };

      if (isProblemDetails(maybeProb)) {
        // TypeScript should know this is ProblemDetails
        expect(maybeProb.status).toBe(404);
      }
    });
  });

  describe('TypeScript types', () => {
    it('should export ProblemDetails type', () => {
      const problem: ProblemDetails = {
        type: 'about:blank',
        status: 404,
      };

      expect(problem).toBeDefined();
    });

    it('should export ExtendedProblemDetails type', () => {
      const problem: ExtendedProblemDetails = {
        type: 'about:blank',
        status: 400,
        customField: 'value',
      };

      expect(problem.customField).toBe('value');
    });
  });

  describe('RFC 9457 compliance', () => {
    it('should use about:blank as default type', () => {
      const problem = createProblemDetails({ status: 500 });
      expect(problem.type).toBe('about:blank');
    });

    it('should support all standard fields', () => {
      const problem: ProblemDetails = {
        type: 'https://example.com/probs/out-of-credit',
        title: 'You do not have enough credit.',
        status: 403,
        detail: 'Your current balance is 30, but that costs 50.',
        instance: '/account/12345/msgs/abc',
      };

      expect(validateProblemDetails(problem).success).toBe(true);
    });

    it('should allow extension members', () => {
      const problem = createExtendedProblemDetails({
        type: 'https://example.com/probs/out-of-credit',
        status: 403,
        balance: 30,
        accounts: ['/account/12345', '/account/67890'],
      });

      expect(problem).toEqual({
        type: 'https://example.com/probs/out-of-credit',
        status: 403,
        balance: 30,
        accounts: ['/account/12345', '/account/67890'],
      });
    });
  });
});
