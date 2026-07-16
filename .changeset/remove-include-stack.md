---
"@batkit/express-middleware": patch
---

BREAKING: removed `includeStack` option from `ErrorHandlerOptions`. Stack traces are now always included in the RFC 9457 response — no per-instance toggle.
