---
"@batkit/errors": patch
---

BREAKING: `AppError`'s constructor now takes `(statusCode, message, options?)` instead of `(statusCode, message, code?, details?, isOperational?)` — the trailing positional args are now a single options object `{ code?, details?, isOperational? }`. Subclass constructors (`BadRequestError`, `NotFoundError`, etc.) are unchanged. Also extracts hardcoded HTTP status literals into a shared `HttpStatus` map and adds a `no-magic-numbers` lint rule.
