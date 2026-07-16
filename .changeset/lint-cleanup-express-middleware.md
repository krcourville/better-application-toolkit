---
"@batkit/express-middleware": patch
---

Internal cleanup only, no behavior change: split `errorHandler`'s logging and problem-details-building logic into two named helper functions (both were over the `max-lines-per-function` threshold), replaced a nested ternary with an if/else, and extracted hardcoded HTTP status literals into a shared `HttpStatus` map.
