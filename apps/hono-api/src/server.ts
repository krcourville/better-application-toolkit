import type { Server } from "node:http";
import { LoggerFacade } from "@batkit/logger";
import { serve } from "@hono/node-server";
import { PORT, app } from "./app.js";

const EXIT_SUCCESS = 0;
const EXIT_FAILURE = 1;
const SHUTDOWN_TIMEOUT_MS = 5000;

export function startServer(): void {
  const logger = LoggerFacade.getLogger("server");

  // `serve()` returns `ServerType = Server | Http2Server | Http2SecureServer`.
  // This app never passes http2 options, so it's always a plain `node:http` Server.
  const httpServer = serve({ fetch: app.fetch, port: Number(PORT) }, () => {
    logger.info(`Server started on http://localhost:${PORT}`);
    logger.info(`Docs available at http://localhost:${PORT}/docs`);
  }) as Server;

  let shuttingDown = false;

  function shutdown(signal: string): void {
    if (shuttingDown) {
      logger.warn("Received second signal, forcing immediate exit", { signal });
      process.exit(EXIT_FAILURE);
    }
    shuttingDown = true;
    logger.info("Received signal, starting graceful shutdown", { signal });

    httpServer.close(() => {
      logger.info("Server closed, exiting process");
      process.exit(EXIT_SUCCESS);
    });
    // Idle keep-alive sockets otherwise block close()'s callback until
    // Node's default 5s keep-alive timeout fires; drop them immediately.
    httpServer.closeIdleConnections();

    // Force shutdown if in-flight requests haven't finished in time.
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      httpServer.closeAllConnections();
      process.exit(EXIT_FAILURE);
    }, SHUTDOWN_TIMEOUT_MS).unref();
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("uncaughtException", (error) => {
    logger.error(error, "Uncaught exception");
    process.exit(EXIT_FAILURE);
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", { reason: String(reason) });
    process.exit(EXIT_FAILURE);
  });
}
