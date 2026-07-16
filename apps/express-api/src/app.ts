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

const HttpStatus = {
  NOT_FOUND: 404,
  UNPROCESSABLE_ENTITY: 422,
} as const;

/** Default avoids 3000/8080/5173 and other common dev ports; override with `PORT`. */
const DEFAULT_PORT = 3785;
export const PORT = process.env.PORT || DEFAULT_PORT;

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
    description: "Reference API built with ts-rest, express, and BAT middleware.",
    title: "Better Application Toolkit - Express API Reference",
    version: "1.0.0",
  },
  servers: [{ url: `http://localhost:${PORT}` }],
});

// Extract endpoints from OpenAPI spec
const endpoints: Record<string, unknown> = {
  docs: "GET /docs",
  health: "GET /health",
  openApi: "GET /openapi.json",
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
  endpoints,
  message: "Better Application Toolkit - Express API Reference",
  version: "1.0.0",
};

const router = server.router(apiContract, {
  demo: demoHandlers,
  errors: errorHandlers,
  info: async () => ({
    body: {
      data: apiInfo,
    },
    status: 200,
  }),
  users: userHandlers,
});

// Middleware to intercept and transform ts-rest validation errors to RFC 9457
// Must be registered BEFORE createExpressEndpoints(): ts-rest route handlers
// Call res.json() directly without next(), so a patch applied after
// Registration never runs for matched routes (V21).
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
        code: issue.code,
        field: issue.path.join(".") || "root",
        message: issue.message,
      }));

      const problemDetails = createExtendedProblemDetails({
        detail: "Request validation failed",
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        title: "Validation Error",
        type: "error:validation",
        validationErrors,
      });

      // Send the RFC 9457 formatted response
      res.status(HttpStatus.UNPROCESSABLE_ENTITY);
      return originalJson.call(res, problemDetails);
    }

    // For all other responses, pass through normally
    return originalJson.call(res, body);
  };

  next();
});

createExpressEndpoints(apiContract, router, app);

app.get("/openapi.json", (_req, res) => {
  res.json(openApiSpec);
});

// oxlint-disable-next-line no-magic-numbers -- [0] is a type-level tuple index, not a runtime value; there's no constant to extract.
type ApiReferenceOptions = Parameters<typeof apiReference>[0];

app.use(
  "/docs",
  apiReference({
    spec: {
      url: "/openapi.json",
    },
  } as ApiReferenceOptions),
);

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(HttpStatus.NOT_FOUND).json({
    detail: `The route ${req.method} ${req.path} does not exist`,
    instance: req.path,
    status: HttpStatus.NOT_FOUND,
    title: "Route Not Found",
    type: "error:not-found",
  });
});

// Error handler middleware (MUST be last)
app.use(errorHandler());
