import { LoggerFacade } from "@batkit/logger";
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
              options: {
                colorize: true,
                ignore: "pid,hostname",
                translateTime: "SYS:yyyy-mm-dd HH:MM:ss.l",
              },
              target: "pino-pretty",
            },
          }
        : {}),
    }),
  ),
);
