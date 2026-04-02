import { Writable } from "node:stream";
import pino from "pino";
import { describe, expect, it } from "vite-plus/test";

import { PinoLoggerProvider } from "./index.js";
import { adaptPinoToBatkitLogger } from "./pino-batkit-adapter.js";

type PinoRootOptions = NonNullable<ConstructorParameters<typeof pino>[0]>;

function sinkPino() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      lines.push(chunk.toString().trimEnd());
      cb();
    },
  });
  const root = pino({ level: "debug" }, stream);
  return { root, lines };
}

function parseSingleLine(lines: string[]): Record<string, unknown> {
  expect(lines).toHaveLength(1);
  const [line] = lines;
  expect(line).toBeDefined();
  return JSON.parse(line) as Record<string, unknown>;
}

describe("adaptPinoToBatkitLogger", () => {
  it("merges context for message-first info(msg, ctx)", () => {
    const { root, lines } = sinkPino();
    const log = adaptPinoToBatkitLogger(root.child({ name: "fulfillment" }));
    log.info("Pipeline start", { orderId: "o-1" });
    const row = parseSingleLine(lines);
    expect(row.msg).toBe("Pipeline start");
    expect(row.orderId).toBe("o-1");
    expect(row.name).toBe("fulfillment");
  });

  it("supports message-only info(msg)", () => {
    const { root, lines } = sinkPino();
    const log = adaptPinoToBatkitLogger(root.child({}));
    log.info("yo");
    const row = parseSingleLine(lines);
    expect(row.msg).toBe("yo");
  });

  it("supports context-only info(ctx)", () => {
    const { root, lines } = sinkPino();
    const log = adaptPinoToBatkitLogger(root.child({}));
    log.info({ orderId: "x" });
    const row = parseSingleLine(lines);
    expect(row.orderId).toBe("x");
    expect(row.msg).toBeUndefined();
  });

  it("maps error(error, ctx) to merged err + ctx", () => {
    const { root, lines } = sinkPino();
    const log = adaptPinoToBatkitLogger(root.child({}));
    log.error(new Error("nope"), { retries: 2 });
    const row = parseSingleLine(lines);
    expect(row.err.message).toBe("nope");
    expect(row.retries).toBe(2);
  });

  it("maps error(error, msg, ctx)", () => {
    const { root, lines } = sinkPino();
    const log = adaptPinoToBatkitLogger(root.child({}));
    log.error(new Error("nope"), "paid failed", { userId: "u" });
    const row = parseSingleLine(lines);
    expect(row.msg).toBe("paid failed");
    expect(row.err.message).toBe("nope");
    expect(row.userId).toBe("u");
  });

  it("supports error(error, msg) two-arg", () => {
    const { root, lines } = sinkPino();
    const log = adaptPinoToBatkitLogger(root.child({}));
    log.error(new Error("nope"), "short");
    const row = parseSingleLine(lines);
    expect(row.msg).toBe("short");
    expect(row.err.message).toBe("nope");
  });
});

describe("PinoLoggerProvider", () => {
  it("isLogLevelEnabled uses lowercase pino levels", () => {
    const provider = new PinoLoggerProvider({ level: "info" } as PinoRootOptions);
    expect(provider.isLogLevelEnabled("INFO")).toBe(true);
    expect(provider.isLogLevelEnabled("DEBUG")).toBe(false);
  });
});
