# Guided Tour for cli-app

The goal of cli-app is to demonstrate, via a simple Node processing app,
techniques that add context to logging while applying the DRY principle.

## 1. Logging Configuration

1. Configuration starts in `./src/logging.ts`.
2. LoggerFacade is configured with **Pino** via `@batkit/logger-pino`.
3. And ContextualLoggerProvider is also configured (more on this below).
4. LoggerFacade does not configure Pino itself.
   LoggerFacade's only job is to provide a common interface for logging. It is up to
   the LoggerFacade implementation to understand and configure the logging behavior.
5. LoggerFacade is re-exported. This is an optional step that can accomplish a couple of things:
   - Ensures the logging configuration is applied first. Otherwise you must import something that
     pulls in `./src/logging.js` (for example `import { LoggerFacade } from './logging.js'`) at the
     application entry point before other modules call `LoggerFacade.getLogger`.
   - Avoids having to reference a 3rd party module throughout the application (`@batkit/logger` in this case)
     which allows the LoggerFacade to be swapped out in one place, should this be desired.

## 2. Adding Context with Named Loggers

1. From the **monorepo root**, run `vp run cli` (builds workspace deps and starts this app’s
   `dev` script). From `apps/cli-app`, run `vp run dev` instead.
2. LoggerFacade enforces the use of named loggers.
3. A named logger is a logger instance initialized with a `name` property which is appended to every log
   entry.
4. The logger name adds context!
5. Depending on code style, the name can include a module, class, and/or function name.
6. Review `./src/index.ts`, `./src/transaction-processor.ts`, and `./src/async-utils.ts`.
7. Run the app and observe which emitted logs include the logger **name** (the segment in parentheses
   after the level in pino-pretty output, e.g. `cli-app.main`, `transaction-processor`).
8. When debugging, logger names are often useful to filter down logs to a particular area of code. And
   without any additional context, you will at least know the module, class, or function name from which
   a log originated.

## 3. Add Context for an Entire Call Stack

1. **Problem:** Named loggers tell you _where_ a line was logged, but you still repeat the same
   structured fields (`correlationId`, `transactionId`, `userId`, …) at every call site if you only
   pass them as the optional context object on each `info` / `error` call.
2. **Approach:** Node’s `AsyncLocalStorage` holds a small, mutable bag of fields for the current async
   scope. **`logger.runWithContext(initial, fn)`** (from `@batkit/logger/async-local`, also exposed on
   every `Logger`) runs `fn` inside that scope. Any code reached from `fn`—including `await`ed work in
   the same logical chain—can log without repeating those fields; they are merged automatically when
   you wrap the underlying provider with **`ContextualLoggerProvider`** (see `./src/logging.ts`).
3. **Outer scope:** In `./src/index.ts`, the app wraps `main` in
   `logger.runWithContext({ correlationId }, main)`. Every log emitted while `main` runs (until it
   completes) can include `correlationId` without passing it on each line.
4. **Inner scope:** Each iteration uses `logger.runWithContext({ transactionId }, async () => { … })`.
   Nested calls **merge** with the parent store, so inner logs show both `correlationId` and
   `transactionId`. That models a batch job (one correlation for the run) plus per-item work.
5. **Optional:** Inside a scope you can call **`logger.mergeContext({ ... })`** to add or update fields
   as you learn them (e.g. after parsing input), without extra nested `runWithContext` calls.
6. **Try it:** Run the app and compare lines inside the per-transaction callback to those before the
   loop: shared batch fields plus per-transaction fields should appear together on `async-utils` and
   `transaction-processor` logs without duplicating those keys at every `logger.info` call.
