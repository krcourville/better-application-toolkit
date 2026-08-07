# @batkit/errors

## 1.0.1

### Patch Changes

- 1f41248: Fix stale/incomplete README docs accumulated since the 1.0.0 release, never republished:

  - Add a "Links" section (Source + Issues) to every package README, pointing consumers back to the repo.
  - `logger-pino`: replace a fully fabricated API section (`createPinoLogger`, `PinoLoggerFactory`, etc.) with the real exports (`PinoLoggerProvider`, `adaptPinoToBatkitLogger`).
  - `errors`: fix a stale pre-0.1.3 `AppError` constructor signature and an incorrect `toJSON()` stack-trace claim.
  - `express-middleware`: remove a reference to an unexported `RequestContext` type; split async-local-context examples into a bootstrap block vs. app-code block so the app-code example doesn't imply an async-local import is needed outside bootstrap.
  - `logger`: same bootstrap/app split for the async-local example; clarify `mergeContext`/`runWithContext` live on `Logger` itself.
  - `express-middleware`: drop an unnecessary inline `import("@batkit/logger").LogValue` type reference in favor of a top-level `import type`.

- Updated dependencies [1f41248]
  - @batkit/rfc9457@1.0.1

## 1.0.0

### Major Changes

- a1567fd: 1.0.0: first stable release. Public API surface reviewed and frozen — breaking changes from this point require a major version bump.

### Patch Changes

- Updated dependencies [a1567fd]
  - @batkit/rfc9457@1.0.0

## 0.1.3

### Patch Changes

- 5d9f397: BREAKING: `AppError`'s constructor now takes `(statusCode, message, options?)` instead of `(statusCode, message, code?, details?, isOperational?)` — the trailing positional args are now a single options object `{ code?, details?, isOperational? }`. Subclass constructors (`BadRequestError`, `NotFoundError`, etc.) are unchanged. Also extracts hardcoded HTTP status literals into a shared `HttpStatus` map and adds a `no-magic-numbers` lint rule.
- Updated dependencies [5d9f397]
  - @batkit/rfc9457@0.1.2

## 0.1.2

### Patch Changes

- 113677e: BREAKING: `ValidationError` now returns status 422 (Unprocessable Entity) instead of 400 — aligns with the zod-driven `formatZodError` path so both validation-error code paths return the same status.

## 0.1.1

### Patch Changes

- e61bb43: Fix publint/attw findings: normalize repository.url to git+ URL form, mark packages side-effect free for tree-shaking.
- Updated dependencies [e61bb43]
  - @batkit/rfc9457@0.1.1
