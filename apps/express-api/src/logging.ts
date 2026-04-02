import { type Logger, LoggerFacade } from "@batkit/logger";
import { PinoLoggerProvider } from "@batkit/logger-pino";
import { ContextualLoggerProvider } from "@batkit/logger/async-local";

const prettyLogs = process.env.LOCAL_DEV === "true";

const logLevel = (process.env.LOG_LEVEL ?? "info").toLowerCase();

LoggerFacade.setProvider(
  new ContextualLoggerProvider(
    new PinoLoggerProvider({
      level: logLevel,
      ...(prettyLogs
        ? {
            transport: {
              target: "pino-pretty",
              options: {
                colorize: true,
                translateTime: "SYS:yyyy-mm-dd HH:MM:ss.l",
                ignore: "pid,hostname",
              },
            },
          }
        : {}),
    }),
  ),
);

/** App-level logger (uses contextual + Pino provider above). */
export const logger: Logger = LoggerFacade.getLogger("express-api");
