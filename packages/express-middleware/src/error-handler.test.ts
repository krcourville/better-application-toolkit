import {
  type LogLevel,
  type LogValue,
  type Logger,
  LoggerFacade,
  type LoggerProvider,
} from "@batkit/logger";
import { fromPartial } from "@total-typescript/shoehorn";
import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { DefaultErrorFormatter, type errorHandler as ErrorHandlerFn } from "./error-handler.js";

const HttpStatus = {
  UNPROCESSABLE_ENTITY: 422,
} as const;

const FIRST_CALL_INDEX = 0;
const SINGLE_LOG_CALL = 1;
// oxlint-disable-next-line no-magic-numbers -- these are the well-known JPEG magic-number byte signature; naming each byte separately would hurt readability, not help.
const JPEG_MAGIC_BYTES = [0xff, 0xd8, 0xff];

class RecordingLogger implements Logger {
  calls: unknown[][] = [];

  debug: Logger["debug"] = (...args: unknown[]) => this.calls.push(args);
  info: Logger["info"] = (...args: unknown[]) => this.calls.push(args);
  warn: Logger["warn"] = (...args: unknown[]) => this.calls.push(args);
  error: Logger["error"] = (...args: unknown[]) => this.calls.push(args);
  mergeContext(): void {}
  runWithContext<Result>(_initial: Record<string, LogValue>, fn: () => Result): Result {
    return fn();
  }
}

class RecordingLoggerProvider implements LoggerProvider {
  logger = new RecordingLogger();
  getLogger(): Logger {
    return this.logger;
  }
  isLogLevelEnabled(_level: LogLevel): boolean {
    return true;
  }
}

describe("errorHandler logging", () => {
  let originalProvider: LoggerProvider;
  let provider: RecordingLoggerProvider;
  let errorHandler: typeof ErrorHandlerFn;

  beforeEach(async () => {
    // Error-handler.ts binds its logger at module-eval time via
    // LoggerFacade.getLogger(), so both @batkit/logger and error-handler.ts
    // Must be freshly imported (after resetModules) with the recording
    // Provider installed before that binding happens.
    originalProvider = LoggerFacade.getProvider();
    provider = new RecordingLoggerProvider();
    vi.resetModules();
    const freshLoggerModule = await import("@batkit/logger");
    freshLoggerModule.LoggerFacade.setProvider(provider);
    ({ errorHandler } = await import("./error-handler.js"));
  });

  afterEach(() => {
    LoggerFacade.setProvider(originalProvider);
    vi.resetModules();
  });

  it("logs request query under `query`, not `querd`/`consoley`", async () => {
    const handler = errorHandler();
    const req = fromPartial<Request>({
      body: {},
      method: "GET",
      path: "/widgets",
      query: { id: "42" },
    });
    const res = fromPartial<Response>({
      headersSent: false,
      json: () => res,
      set: () => res,
      status: () => res,
    });

    handler(new Error("boom"), req, res, () => {});

    expect(provider.logger.calls).toHaveLength(SINGLE_LOG_CALL);
    const [, context] = provider.logger.calls[FIRST_CALL_INDEX] as [
      unknown,
      Record<string, unknown>,
    ];

    expect(context.query).toEqual({ id: "42" });
    expect(context.method).toBe("GET");
    expect(context.querd).toBeUndefined();
    expect(context.consoley).toBeUndefined();
  });

  it("omits raw body and logs content-type+length when body is binary", async () => {
    const handler = errorHandler();
    const req = fromPartial<Request>({
      body: Buffer.from(JPEG_MAGIC_BYTES),
      headers: { "content-type": "image/jpeg" },
      method: "POST",
      path: "/upload",
      query: {},
    });
    const res = fromPartial<Response>({
      headersSent: false,
      json: () => res,
      set: () => res,
      status: () => res,
    });

    handler(new Error("boom"), req, res, () => {});

    const [, context] = provider.logger.calls[FIRST_CALL_INDEX] as [
      unknown,
      Record<string, unknown>,
    ];

    expect(context.body).toBeUndefined();
    expect(context.bodyContentType).toBe("image/jpeg");
    expect(context.bodyLength).toBe(JPEG_MAGIC_BYTES.length);
  });

  it("omits raw body and logs content-type+length when body is non-Buffer but content-type is non-JSON", async () => {
    const handler = errorHandler();
    const rawTextBody = "raw plain text body";
    const req = fromPartial<Request>({
      body: rawTextBody,
      headers: { "content-type": "text/plain" },
      method: "POST",
      path: "/upload",
      query: {},
    });
    const res = fromPartial<Response>({
      headersSent: false,
      json: () => res,
      set: () => res,
      status: () => res,
    });

    handler(new Error("boom"), req, res, () => {});

    const [, context] = provider.logger.calls[FIRST_CALL_INDEX] as [
      unknown,
      Record<string, unknown>,
    ];

    expect(context.body).toBeUndefined();
    expect(context.bodyContentType).toBe("text/plain");
    expect(context.bodyLength).toBe(rawTextBody.length);
  });

  it("still logs body when not binary", async () => {
    const handler = errorHandler();
    const req = fromPartial<Request>({
      body: { name: "widget" },
      headers: { "content-type": "application/json" },
      method: "POST",
      path: "/widgets",
      query: {},
    });
    const res = fromPartial<Response>({
      headersSent: false,
      json: () => res,
      set: () => res,
      status: () => res,
    });

    handler(new Error("boom"), req, res, () => {});

    const [, context] = provider.logger.calls[FIRST_CALL_INDEX] as [
      unknown,
      Record<string, unknown>,
    ];

    expect(context.body).toEqual({ name: "widget" });
    expect(context.bodyContentType).toBeUndefined();
    expect(context.bodyLength).toBeUndefined();
  });
});

describe("DefaultErrorFormatter", () => {
  it("formats zod errors with 422 status, not 400", () => {
    const formatter = new DefaultErrorFormatter();
    const zodError = {
      issues: [{ code: "invalid_type", message: "Required", path: ["name"] }],
    };

    const result = formatter.format(zodError);

    expect(result.status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
  });
});
