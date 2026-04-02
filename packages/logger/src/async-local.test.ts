import { describe, expect, it, vi } from "vite-plus/test";
import {
  ContextualLoggerProvider,
  getLogContext,
  mergeLogContext,
  runWithContext,
} from "./async-local.js";
import type { Logger, LoggerProvider } from "./types.js";

function capturingProvider(): {
  provider: LoggerProvider;
  calls: unknown[][];
} {
  const calls: unknown[][] = [];
  const logger: Logger = {
    debug: vi.fn((...args: unknown[]) => {
      calls.push(args);
    }),
    info: vi.fn((...args: unknown[]) => {
      calls.push(args);
    }),
    warn: vi.fn((...args: unknown[]) => {
      calls.push(args);
    }),
    error: vi.fn((...args: unknown[]) => {
      calls.push(args);
    }),
    mergeContext: vi.fn(),
    runWithContext,
  };
  return {
    provider: {
      getLogger: () => logger,
      isLogLevelEnabled: () => true,
    },
    calls,
  };
}

describe("runWithContext", () => {
  it("exposes initial fields via getLogContext", () => {
    runWithContext({ requestId: "r1" }, () => {
      expect(getLogContext()).toEqual({ requestId: "r1" });
    });
  });

  it("propagates through await", async () => {
    await runWithContext({ requestId: "r-await" }, async () => {
      await Promise.resolve();
      expect(getLogContext()?.requestId).toBe("r-await");
    });
  });

  it("isolates concurrent async contexts", async () => {
    const seen: string[] = [];
    await Promise.all([
      runWithContext({ id: "a" }, async () => {
        await new Promise((r) => setImmediate(r));
        seen.push(`a:${getLogContext()?.id as string}`);
      }),
      runWithContext({ id: "b" }, async () => {
        await new Promise((r) => setImmediate(r));
        seen.push(`b:${getLogContext()?.id as string}`);
      }),
    ]);
    expect(seen).toEqual(expect.arrayContaining(["a:a", "b:b"]));
  });

  it("inherits parent store when nesting runWithContext", () => {
    runWithContext({ requestId: "outer" }, () => {
      runWithContext({ transactionId: "t1" }, () => {
        expect(getLogContext()).toEqual({
          requestId: "outer",
          transactionId: "t1",
        });
      });
    });
  });

  it("lets inner initial override the same key as parent", () => {
    runWithContext({ id: "parent" }, () => {
      runWithContext({ id: "child" }, () => {
        expect(getLogContext()).toEqual({ id: "child" });
      });
    });
  });
});

describe("mergeLogContext", () => {
  it("mutates store for remainder of scope", () => {
    runWithContext({ requestId: "r0" }, () => {
      mergeLogContext({ transactionId: "t1" });
      expect(getLogContext()).toEqual({
        requestId: "r0",
        transactionId: "t1",
      });
    });
  });

  it("throws outside runWithContext", () => {
    expect(() => mergeLogContext({ x: 1 })).toThrow(/runWithContext/);
  });
});

describe("ContextualLoggerProvider", () => {
  it("merges async context into message + context logs", () => {
    const { provider, calls } = capturingProvider();
    const wrapped = new ContextualLoggerProvider(provider);
    const log = wrapped.getLogger("test");

    runWithContext({ requestId: "req-1" }, () => {
      log.info("hello", { extra: true });
    });

    expect(calls[0]).toEqual(["hello", { requestId: "req-1", extra: true }]);
  });

  it("lets call-site context override ALS keys", () => {
    const { provider, calls } = capturingProvider();
    const wrapped = new ContextualLoggerProvider(provider);
    const log = wrapped.getLogger("test");

    runWithContext({ requestId: "outer" }, () => {
      log.info("x", { requestId: "inner" });
    });

    expect(calls[0]).toEqual(["x", { requestId: "inner" }]);
  });

  it("merges into error overloads", () => {
    const { provider, calls } = capturingProvider();
    const wrapped = new ContextualLoggerProvider(provider);
    const log = wrapped.getLogger("test");
    const err = new Error("fail");

    runWithContext({ rid: "r" }, () => {
      log.error(err, "nope", { step: 2 });
    });

    expect(calls[0]).toEqual([err, "nope", { rid: "r", step: 2 }]);
  });

  it("exposes mergeContext on the logger", () => {
    const { provider, calls } = capturingProvider();
    const wrapped = new ContextualLoggerProvider(provider);
    const log = wrapped.getLogger("test");

    runWithContext({ requestId: "r0" }, () => {
      log.mergeContext({ transactionId: "t-merge" });
      expect(getLogContext()).toEqual({
        requestId: "r0",
        transactionId: "t-merge",
      });
      log.info("after merge");
      expect(calls[0]).toEqual(["after merge", { requestId: "r0", transactionId: "t-merge" }]);
    });
  });

  it("exposes runWithContext on the logger", () => {
    const { provider, calls } = capturingProvider();
    const wrapped = new ContextualLoggerProvider(provider);
    const log = wrapped.getLogger("test");

    log.runWithContext({ jobId: "j1" }, () => {
      log.info("inside job");
    });

    expect(calls[0]).toEqual(["inside job", { jobId: "j1" }]);
  });
});
