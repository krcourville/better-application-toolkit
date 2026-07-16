# @batkit/express-middleware

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
