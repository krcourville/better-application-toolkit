import { LoggerFacade } from "@batkit/logger";
import { PORT, app } from "./app.js";

const EXIT_SUCCESS = 0;
const EXIT_FAILURE = 1;
const SHUTDOWN_TIMEOUT_MS = 10_000;

export function startServer(): void {
  const logger = LoggerFacade.getLogger("server");

  const httpServer = app.listen(PORT, () => {
    logger.info(`Server started on http://localhost:${PORT}`);
    logger.info(`Docs available at http://localhost:${PORT}/docs`);
  });

  function shutdown(signal: string): void {
    logger.info("Received signal, starting graceful shutdown", { signal });

    httpServer.close(() => {
      logger.info("Server closed, exiting process");
      process.exit(EXIT_SUCCESS);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(EXIT_FAILURE);
    }, SHUTDOWN_TIMEOUT_MS);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Handle uncaught errors
  process.on("uncaughtException", (error) => {
    logger.error(error, "Uncaught exception");
    process.exit(EXIT_FAILURE);
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", { reason: String(reason) });
    process.exit(EXIT_FAILURE);
  });
}
