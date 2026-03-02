import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

export const errorsContract = c.router({
  badRequest: {
    method: 'GET',
    path: '/errors/400',
    responses: {
      204: z.null(),
    },
  },
  unauthorized: {
    method: 'GET',
    path: '/errors/401',
    responses: {
      204: z.null(),
    },
  },
  forbidden: {
    method: 'GET',
    path: '/errors/403',
    responses: {
      204: z.null(),
    },
  },
  notFound: {
    method: 'GET',
    path: '/errors/404',
    responses: {
      204: z.null(),
    },
  },
  conflict: {
    method: 'GET',
    path: '/errors/409',
    responses: {
      204: z.null(),
    },
  },
  validation: {
    method: 'GET',
    path: '/errors/422',
    responses: {
      204: z.null(),
    },
  },
  rateLimit: {
    method: 'GET',
    path: '/errors/429',
    responses: {
      204: z.null(),
    },
  },
  internal: {
    method: 'GET',
    path: '/errors/500',
    responses: {
      204: z.null(),
    },
  },
  serviceUnavailable: {
    method: 'GET',
    path: '/errors/503',
    responses: {
      204: z.null(),
    },
  },
  generic: {
    method: 'GET',
    path: '/errors/generic',
    responses: {
      204: z.null(),
    },
  },
});
