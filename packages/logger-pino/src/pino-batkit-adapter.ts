import type { Logger as BatkitLogger, LogValue } from '@batkit/logger';
import { mergeLogContext } from '@batkit/logger/async-local';
import type { Logger as PinoLogger } from 'pino';

type LogContext = Record<string, LogValue>;

function isPlainContext(value: unknown): value is LogContext {
  return (
    value !== null &&
    typeof value === 'object' &&
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
  level: 'debug' | 'info' | 'warn' | 'error'
): BatkitLogger['info'] {
  const logFn = pinoChild[level].bind(pinoChild) as (objOrMsg: unknown, msg?: string) => void;

  return ((a: unknown, b?: unknown, c?: unknown) => {
    if (isPlainContext(a) && b === undefined && c === undefined) {
      logFn(a);
      return;
    }

    if (typeof a === 'string') {
      const msg = a;
      if (b !== undefined && isPlainContext(b)) {
        logFn(b, msg);
        return;
      }
      logFn(msg);
      return;
    }

    if (a instanceof Error) {
      const err = a;
      if (b === undefined && c === undefined) {
        logFn(err);
        return;
      }
      if (typeof b === 'string' && c === undefined) {
        logFn(err, b);
        return;
      }
      if (typeof b === 'string' && isPlainContext(c)) {
        logFn({ err, ...c }, b);
        return;
      }
      if (isPlainContext(b) && c === undefined) {
        logFn({ err, ...b });
        return;
      }
      logFn(err);
      return;
    }

    logFn(a as never);
  }) as BatkitLogger['info'];
}

export function adaptPinoToBatkitLogger(pinoChild: PinoLogger): BatkitLogger {
  return {
    debug: wrapLevel(pinoChild, 'debug'),
    info: wrapLevel(pinoChild, 'info'),
    warn: wrapLevel(pinoChild, 'warn'),
    error: wrapLevel(pinoChild, 'error'),
    mergeContext: mergeLogContext,
  };
}
