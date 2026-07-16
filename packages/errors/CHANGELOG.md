# @batkit/errors

## 0.1.2

### Patch Changes

- 113677e: BREAKING: `ValidationError` now returns status 422 (Unprocessable Entity) instead of 400 — aligns with the zod-driven `formatZodError` path so both validation-error code paths return the same status.

## 0.1.1

### Patch Changes

- e61bb43: Fix publint/attw findings: normalize repository.url to git+ URL form, mark packages side-effect free for tree-shaking.
- Updated dependencies [e61bb43]
  - @batkit/rfc9457@0.1.1
