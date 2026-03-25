import { getLogContext } from "@batkit/logger/async-local";
import type { Request, Response } from "express";
import { describe, expect, it } from "vitest";
import { logContextMiddleware } from "./log-context-middleware.js";

describe("logContextMiddleware", () => {
	it("runs next() inside runWithLogContext so getLogContext() works", () => {
		const mw = logContextMiddleware({
			initialContext: () => ({ requestId: "req-test" }),
		});
		let seen = getLogContext();
		expect(seen).toBeUndefined();

		mw({} as Request, {} as Response, () => {
			seen = getLogContext();
		});

		expect(seen).toEqual({ requestId: "req-test" });
	});
});
