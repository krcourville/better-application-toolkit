import { createRoute } from "@hono/zod-openapi";

function noContentRoute(path: string) {
  return createRoute({
    method: "get",
    path,
    responses: {
      204: {
        description: "No content (throws before response is built)",
      },
    },
  });
}

export const badRequestRoute = noContentRoute("/errors/400");
export const unauthorizedRoute = noContentRoute("/errors/401");
export const forbiddenRoute = noContentRoute("/errors/403");
export const notFoundRoute = noContentRoute("/errors/404");
export const conflictRoute = noContentRoute("/errors/409");
export const validationRoute = noContentRoute("/errors/422");
export const rateLimitRoute = noContentRoute("/errors/429");
export const internalRoute = noContentRoute("/errors/500");
export const serviceUnavailableRoute = noContentRoute("/errors/503");
export const genericRoute = noContentRoute("/errors/generic");
