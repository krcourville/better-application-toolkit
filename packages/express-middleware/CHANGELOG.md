# @batkit/express-middleware

## 1.0.0

### Major Changes

- a1567fd: 1.0.0: first stable release. Public API surface reviewed and frozen — breaking changes from this point require a major version bump.

### Patch Changes

- Updated dependencies [a1567fd]
  - @batkit/rfc9457@1.0.0
  - @batkit/errors@1.0.0
  - @batkit/logger@1.0.0

## 0.1.5

### Patch Changes

- 5d9f397: Internal cleanup only, no behavior change: split `errorHandler`'s logging and problem-details-building logic into two named helper functions (both were over the `max-lines-per-function` threshold), replaced a nested ternary with an if/else, and extracted hardcoded HTTP status literals into a shared `HttpStatus` map.
- Updated dependencies [5d9f397]
- Updated dependencies [5d9f397]
- Updated dependencies [5d9f397]
  - @batkit/errors@0.1.3
  - @batkit/logger@0.1.2
  - @batkit/rfc9457@0.1.2

## 0.1.4

### Patch Changes

- 4048a6d: error-handler: broaden the binary-body log guard to also cover non-Buffer bodies with a non-JSON content-type (e.g. `text/plain`), not just `Buffer.isBuffer`. Previously only Buffer bodies were kept out of raw error logs; other non-JSON bodies still logged raw.

## 0.1.3

### Patch Changes

- Updated dependencies [113677e]
  - @batkit/errors@0.1.2

## 0.1.2

### Patch Changes

- 230508d: error-handler: omit raw request body from error logs when body is binary (Buffer); logs content-type and length instead
- 903dd32: BREAKING: removed `includeStack` option from `ErrorHandlerOptions`. Stack traces are now always included in the RFC 9457 response — no per-instance toggle.
- 92f41b7: DefaultErrorFormatter: zod validation errors now return 422 (Unprocessable Entity) instead of 400 (Bad Request), matching RFC 9457 convention for semantically-invalid-but-syntactically-valid requests

## 0.1.1

### Patch Changes

- e61bb43: Fix publint/attw findings: normalize repository.url to git+ URL form, mark packages side-effect free for tree-shaking.
- d1fb00a: Fix error-handler logging typo'd field names (`querd`/`consoley`) so request query params are logged under the correct `query` key.
- Updated dependencies [e61bb43]
  - @batkit/rfc9457@0.1.1
  - @batkit/errors@0.1.1
  - @batkit/logger@0.1.1
