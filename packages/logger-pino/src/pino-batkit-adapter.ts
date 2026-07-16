import type { Logger as BatkitLogger, LogValue } from "@batkit/logger";
import { mergeLogContext, runWithContext } from "@batkit/logger/async-local";
import type { Logger as PinoLogger } from "pino";

type LogContext = Record<string, LogValue>;

function isPlainContext(value: unknown): value is LogContext {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !(value instanceof Error)
  );
}

/**
 * Pino’s `LogFn` treats the first string as the message when you call
 * `log.info('msg', { a: 1 })`, so `{ a: 1 }` becomes the message — not merged context.
 * Batkit’s {@link LogMethod} uses `log.info('msg', context)`; map that to
 * `log.info(context, 'msg')`.
 */
function wrapLevel(
  pinoChild: PinoLogger,
  level: "debug" | "info" | "warn" | "error",
): BatkitLogger["info"] {
  const logFn = pinoChild[level].bind(pinoChild) as (objOrMsg: unknown, msg?: string) => void;

  return ((first: unknown, second?: unknown, third?: unknown) => {
    if (isPlainContext(first) && second === undefined && third === undefined) {
      logFn(first);
      return;
    }

    if (typeof first === "string") {
      const msg = first;
      if (second !== undefined && isPlainContext(second)) {
        logFn(second, msg);
        return;
      }
      logFn(msg);
      return;
    }

    if (first instanceof Error) {
      const err = first;
      if (second === undefined && third === undefined) {
        logFn(err);
        return;
      }
      if (typeof second === "string" && third === undefined) {
        logFn(err, second);
        return;
      }
      if (typeof second === "string" && isPlainContext(third)) {
        logFn({ err, ...third }, second);
        return;
      }
      if (isPlainContext(second) && third === undefined) {
        logFn({ err, ...second });
        return;
      }
      logFn(err);
      return;
    }

    logFn(first as never);
  }) as BatkitLogger["info"];
}

export function adaptPinoToBatkitLogger(pinoChild: PinoLogger): BatkitLogger {
  return {
    debug: wrapLevel(pinoChild, "debug"),
    error: wrapLevel(pinoChild, "error"),
    info: wrapLevel(pinoChild, "info"),
    mergeContext: mergeLogContext,
    runWithContext,
    warn: wrapLevel(pinoChild, "warn"),
  };
}
