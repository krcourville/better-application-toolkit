---
"@batkit/express-middleware": patch
---

DefaultErrorFormatter: zod validation errors now return 422 (Unprocessable Entity) instead of 400 (Bad Request), matching RFC 9457 convention for semantically-invalid-but-syntactically-valid requests
