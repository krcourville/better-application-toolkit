---
name: ci-guard
description: |
  Runs this repo's CI checks locally before commit/push so failures surface
  before GitHub Actions does. On "commit" — scope checks to the packages/apps
  touched by staged files (build+typecheck+lint+test), fast feedback. On
  "push" — run the FULL ci.yml sequence unscoped (build, publint, attw,
  check, typecheck, knip, test), since publint/attw/knip need whole-repo
  context and can't be scoped safely (a package-scoped knip run gives
  plausible-but-wrong results — B8, B24 in SPEC.md). Triggers whenever the
  user asks to commit or push changes in this repo. Does not replace the
  commit-message-drafting or push-safety instructions already in play —
  this only adds the pre-flight check gate in front of them.
---

# ci-guard — local CI before commit/push

Root cause this exists: pushed to `main` once without running `knip` locally
(only ran build/typecheck/check/test) — CI caught an unused export that a
full local run would have too (`SPEC.md` B24). Cheaper to catch locally.

## On "commit"

1. `git diff --staged --name-only` — the file list this commit will contain.
2. Map each path to a workspace package/app:
   - `packages/<name>/...` → `@batkit/<name>`
   - `apps/<name>/...` → `<name>`
   - Anything else (root `package.json`, `tsconfig.base.json`,
     `vite.config.ts`, `knip.json`, `.changeset/config.json`,
     `pnpm-lock.yaml`, `SPEC.md`, docs, CI workflows, ...) → treat as
     **root-level**. Root-level touches anything → skip scoping, run the
     full push-tier sequence instead (§ below). Don't guess at blast radius
     for shared config.
3. If every touched path maps to package(s)/app(s) (no root-level hits),
   dedupe the set and run, using `...<pkg>` (package **+ its dependents**,
   so a change to a shared package also re-verifies what depends on it):
   ```
   vp run --filter ...<pkg1> [--filter ...<pkg2> ...] build
   vp run --filter ...<pkg1> [--filter ...<pkg2> ...] typecheck
   vp check <touched-dir-1> [<touched-dir-2> ...]
   vp run --filter ...<pkg1> [--filter ...<pkg2> ...] test
   ```
   Skip `publint`/`attw`/`knip` here — see note above, they need full-repo
   context, a scoped run of any of them is not trustworthy.
4. All green → proceed with the commit (message drafting etc. per standing
   instructions). Any red → stop, report the failure, do **not** commit.
   Fix and re-run rather than committing past a red check.
5. No staged files touch `packages/*` or `apps/*` (e.g. pure docs) → skip
   straight to committing, nothing to check.

## On "push"

Full `ci.yml` sequence, exact step order (order matters — build before
typecheck/test since packages resolve siblings via `dist/`, per `SPEC.md`
B6):

```
vp run -r --cache build
pnpm publint
pnpm attw
vp check
vp run -r --cache typecheck
pnpm knip
vp run -r --cache test
```

All green → `git push`. Any red → stop, fix, re-run from the top (don't
resume mid-sequence — a fix can invalidate an earlier "green").

Before pushing, also check for an in-flight `Release` workflow run on
`main` (`gh run list --branch main --limit 1 --json status,name`). If one
is `in_progress`, wait for it to complete first — pushing while a release
run is mid-`git push` races it (non-fast-forward rejection on their end;
harmless but wastes a CI cycle — hit this exact race live once).

## Non-goals

- Doesn't draft commit messages or decide branch/PR strategy — that's
  the existing commit/push instructions' job, this only gates them.
- Doesn't run `changeset status` or decide whether a changeset is needed
  — publishable-package changes still need a human/agent call on that
  (see `CONTRIBUTING.md`).
- Never skips a check to make push faster. If push-tier checks are too
  slow for a given iteration, that's a signal to commit smaller, not to
  weaken this gate.
