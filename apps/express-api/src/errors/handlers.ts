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
} from '@batkit/errors';

export const errorHandlers = {
  badRequest: async () => {
    throw new BadRequestError('This is a bad request error example');
  },
  unauthorized: async () => {
    throw new UnauthorizedError('Invalid API token provided');
  },
  forbidden: async () => {
    throw new ForbiddenError(
      'You do not have permission to access this resource',
      'admin-panel',
      'view'
    );
  },
  notFound: async () => {
    throw new NotFoundError('Product', '999');
  },
  conflict: async () => {
    throw new ConflictError('Resource already exists', 'User', 'user@example.com');
  },
  validation: async () => {
    throw new ValidationError('Validation failed', [
      {
        field: 'email',
        message: 'Must be a valid email address',
        value: 'invalid-email',
      },
      { field: 'age', message: 'Must be at least 18', value: 15 },
      { field: 'password', message: 'Must be at least 8 characters' },
    ]);
  },
  rateLimit: async () => {
    throw new TooManyRequestsError('Too many requests, please try again later', 60, 100);
  },
  internal: async () => {
    throw new InternalServerError('Simulated internal server error');
  },
  serviceUnavailable: async () => {
    throw new ServiceUnavailableError('Service is temporarily unavailable for maintenance', 3600);
  },
  generic: async () => {
    throw new Error('This is a generic JavaScript error');
  },
};
