import { LoggerFacade } from "@batkit/logger";
import { app, PORT } from "./app.js";

export function startServer(): void {
  const logger = LoggerFacade.getLogger("server");

  const httpServer = app.listen(PORT, () => {
    logger.info("Server started", {
      port: PORT,
    });
  });

  const shutdown = (signal: string) => {
    logger.info("Received signal, starting graceful shutdown", { signal });

    httpServer.close(() => {
      logger.info("Server closed, exiting process");
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Handle uncaught errors
  process.on("uncaughtException", (error) => {
    logger.error(error, "Uncaught exception");
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", { reason: String(reason) });
    process.exit(1);
  });
}
