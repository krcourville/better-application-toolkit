# @batkit/rfc9457

## 1.0.0

### Major Changes

- a1567fd: 1.0.0: first stable release. Public API surface reviewed and frozen — breaking changes from this point require a major version bump.

## 0.1.2

### Patch Changes

- 5d9f397: Internal cleanup only, no behavior change: extracted the HTTP status range bounds (100/599) into named constants and renamed a generic type parameter for lint compliance (`no-magic-numbers`, `id-length`).

## 0.1.1

### Patch Changes

- e61bb43: Fix publint/attw findings: normalize repository.url to git+ URL form, mark packages side-effect free for tree-shaking.
