import "./logging.js";

import { randomUUID } from "node:crypto";
import { errorHandler, logContextMiddleware } from "@batkit/express-middleware";
import { createExtendedProblemDetails } from "@batkit/rfc9457";
import { apiReference } from "@scalar/express-api-reference";
import { createExpressEndpoints, initServer } from "@ts-rest/express";
import { generateOpenApi } from "@ts-rest/open-api";
import express, { type Express } from "express";
import { apiContract } from "./contract.js";
import { demoHandlers } from "./demo/index.js";
import { errorHandlers } from "./errors/index.js";
import { userHandlers } from "./users/index.js";

/** Default avoids 3000/8080/5173 and other common dev ports; override with `PORT`. */
export const PORT = process.env.PORT || 3785;

export { logger } from "./logging.js";

// Create Express app
export const app: Express = express();
const server = initServer();

// Built-in middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  logContextMiddleware({
    initialContext: (req) => ({
      requestId: req.get("x-request-id") ?? randomUUID(),
    }),
  }),
);

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

const openApiSpec = generateOpenApi(apiContract, {
  info: {
    title: "Better Application Toolkit - Express API Reference",
    version: "1.0.0",
    description: "Reference API built with ts-rest, express, and BAT middleware.",
  },
  servers: [{ url: `http://localhost:${PORT}` }],
});

// Extract endpoints from OpenAPI spec
const endpoints: Record<string, unknown> = {
  health: "GET /health",
  openApi: "GET /openapi.json",
  docs: "GET /docs",
};

// Add API endpoints from the OpenAPI spec
if (openApiSpec.paths) {
  for (const [path, pathItem] of Object.entries(openApiSpec.paths)) {
    for (const method of Object.keys(pathItem as Record<string, unknown>)) {
      if (["get", "post", "put", "delete", "patch", "options", "head"].includes(method)) {
        endpoints[`${method.toUpperCase()} ${path}`] = `${method.toUpperCase()} ${path}`;
      }
    }
  }
}

const apiInfo = {
  message: "Better Application Toolkit - Express API Reference",
  version: "1.0.0",
  endpoints,
};

const router = server.router(apiContract, {
  demo: demoHandlers,
  info: async () => ({
    status: 200,
    body: {
      data: apiInfo,
    },
  }),
  users: userHandlers,
  errors: errorHandlers,
});

createExpressEndpoints(apiContract, router, app);
// Middleware to intercept and transform ts-rest validation errors to RFC 9457
app.use((_req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body: Record<string, unknown> | unknown) => {
    // Check if this is a Zod error response (has 'issues' array and 'name' field)
    if (
      body &&
      typeof body === "object" &&
      "issues" in body &&
      Array.isArray(body.issues) &&
      "name" in body &&
      body.name === "ZodError"
    ) {
      interface ValidationIssue {
        path: (string | number)[];
        message: string;
        code: string;
      }

      const validationErrors = body.issues.map((issue: ValidationIssue) => ({
        field: issue.path.join(".") || "root",
        message: issue.message,
        code: issue.code,
      }));

      const problemDetails = createExtendedProblemDetails({
        type: "error:validation",
        title: "Validation Error",
        status: 400,
        detail: "Request validation failed",
        validationErrors,
      });

      // Send the RFC 9457 formatted response
      res.status(400);
      return originalJson.call(res, problemDetails);
    }

    // For all other responses, pass through normally
    return originalJson.call(res, body);
  };

  next();
});

app.get("/openapi.json", (_req, res) => {
  res.json(openApiSpec);
});

app.use(
  "/docs",
  apiReference({
    spec: {
      url: "/openapi.json",
    },
  } as Parameters<typeof apiReference>[0]),
);

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    type: "error:not-found",
    title: "Route Not Found",
    status: 404,
    detail: `The route ${req.method} ${req.path} does not exist`,
    instance: req.path,
  });
});

// Error handler middleware (MUST be last)
app.use(errorHandler());
