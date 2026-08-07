import "./logging.js";

import { randomUUID } from "node:crypto";
import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { demoApp } from "./demo/index.js";
import { errorsApp } from "./errors/index.js";
import { errorHandler, notFoundHandler } from "./lib/error-handler.js";
import { logContextMiddleware } from "./lib/log-context-middleware.js";
import { validationHook } from "./lib/validation-hook.js";
import { usersApp } from "./users/index.js";

/** Default avoids 3000/8080/5173/3785 (express-api) and other common dev ports; override with `PORT`. */
const DEFAULT_PORT = 3786;
export const PORT = process.env.PORT || DEFAULT_PORT;

export const app = new OpenAPIHono({ defaultHook: validationHook });

app.use(
  "*",
  logContextMiddleware({
    initialContext: (ctx) => ({
      requestId: ctx.req.header("x-request-id") ?? randomUUID(),
    }),
  }),
);

app.get("/health", (ctx) =>
  ctx.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }),
);

app.route("/api", demoApp);
app.route("/api", errorsApp);
app.route("/api", usersApp);

app.doc("/openapi.json", {
  info: {
    description: "Reference API built with Hono, @hono/zod-openapi, and BAT packages.",
    title: "Better Application Toolkit - Hono API Reference",
    version: "1.0.0",
  },
  openapi: "3.0.0",
  servers: [{ url: `http://localhost:${PORT}` }],
});

app.get(
  "/docs",
  // oxlint-disable-next-line new-cap -- Scalar() is a factory function returning middleware, not a constructor.
  Scalar({
    url: "/openapi.json",
  }),
);

app.notFound(notFoundHandler);
app.onError(errorHandler);
