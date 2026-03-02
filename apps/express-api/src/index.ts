import { LoggerFacade } from "@batkit/logger";
import { PinoLoggerProvider } from "@batkit/logger-pino";

// Logger configuration should be done as early as possible
LoggerFacade.setProvider(
  new PinoLoggerProvider({
    level: process.env.LOG_LEVEL ?? "info",
    transport: process.env.LOCAL_DEV === "true"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "yyyy-mm-dd HH:MM:ss.l o",
            ignore: "pid,hostname",
          },
        }
      : undefined,
  })
);

import { startServer } from "./server.js";


startServer();
