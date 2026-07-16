# @batkit/errors

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
