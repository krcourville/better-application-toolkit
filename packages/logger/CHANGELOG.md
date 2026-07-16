# @batkit/logger

## 1.0.0

### Major Changes

- a1567fd: 1.0.0: first stable release. Public API surface reviewed and frozen — breaking changes from this point require a major version bump.

## 0.1.2

### Patch Changes

- 5d9f397: Internal cleanup only, no behavior change: merged two overlapping `LogMethod` overloads, converted a constructor parameter property to an explicit class field, and renamed some single-letter identifiers for lint compliance (`no-magic-numbers`, `id-length`, `func-style`).

## 0.1.1

### Patch Changes

- e61bb43: Fix publint/attw findings: normalize repository.url to git+ URL form, mark packages side-effect free for tree-shaking.
