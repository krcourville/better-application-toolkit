# @batkit/express-middleware

## 0.1.1

### Patch Changes

- e61bb43: Fix publint/attw findings: normalize repository.url to git+ URL form, mark packages side-effect free for tree-shaking.
- d1fb00a: Fix error-handler logging typo'd field names (`querd`/`consoley`) so request query params are logged under the correct `query` key.
- Updated dependencies [e61bb43]
  - @batkit/rfc9457@0.1.1
  - @batkit/errors@0.1.1
  - @batkit/logger@0.1.1
