---
"@batkit/errors": patch
---

BREAKING: `ValidationError` now returns status 422 (Unprocessable Entity) instead of 400 — aligns with the zod-driven `formatZodError` path so both validation-error code paths return the same status.
