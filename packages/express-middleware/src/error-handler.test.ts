import { LoggerFacade } from "@batkit/logger";
import type { Logger, LoggerProvider, LogLevel, LogValue } from "@batkit/logger";
import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { errorHandler as ErrorHandlerFn } from "./error-handler.js";

class RecordingLogger implements Logger {
  calls: unknown[][] = [];

  debug: Logger["debug"] = (...args: unknown[]) => this.calls.push(args);
  info: Logger["info"] = (...args: unknown[]) => this.calls.push(args);
  warn: Logger["warn"] = (...args: unknown[]) => this.calls.push(args);
  error: Logger["error"] = (...args: unknown[]) => this.calls.push(args);
  mergeContext(): void {}
  runWithContext<T>(_initial: Record<string, LogValue>, fn: () => T): T {
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
    // error-handler.ts binds its logger at module-eval time via
    // LoggerFacade.getLogger(), so both @batkit/logger and error-handler.ts
    // must be freshly imported (after resetModules) with the recording
    // provider installed before that binding happens.
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
    const req = {
      path: "/widgets",
      method: "GET",
      query: { id: "42" },
      body: {},
    } as unknown as Request;
    const res = {
      headersSent: false,
      status: () => res,
      set: () => res,
      json: () => res,
    } as unknown as Response;

    handler(new Error("boom"), req, res, () => {});

    expect(provider.logger.calls).toHaveLength(1);
    const [, context] = provider.logger.calls[0] as [unknown, Record<string, unknown>];

    expect(context.query).toEqual({ id: "42" });
    expect(context.method).toBe("GET");
    expect(context.querd).toBeUndefined();
    expect(context.consoley).toBeUndefined();
  });
});
