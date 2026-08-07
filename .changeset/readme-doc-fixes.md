---
"@batkit/rfc9457": patch
"@batkit/errors": patch
"@batkit/logger": patch
"@batkit/logger-pino": patch
"@batkit/express-middleware": patch
---

Fix stale/incomplete README docs accumulated since the 1.0.0 release, never republished:

- Add a "Links" section (Source + Issues) to every package README, pointing consumers back to the repo.
- `logger-pino`: replace a fully fabricated API section (`createPinoLogger`, `PinoLoggerFactory`, etc.) with the real exports (`PinoLoggerProvider`, `adaptPinoToBatkitLogger`).
- `errors`: fix a stale pre-0.1.3 `AppError` constructor signature and an incorrect `toJSON()` stack-trace claim.
- `express-middleware`: remove a reference to an unexported `RequestContext` type; split async-local-context examples into a bootstrap block vs. app-code block so the app-code example doesn't imply an async-local import is needed outside bootstrap.
- `logger`: same bootstrap/app split for the async-local example; clarify `mergeContext`/`runWithContext` live on `Logger` itself.
- `express-middleware`: drop an unnecessary inline `import("@batkit/logger").LogValue` type reference in favor of a top-level `import type`.
