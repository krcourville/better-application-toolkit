# SPEC

## §G GOAL

repo ready for AI-agent dev & publish `@batkit/*` pkgs to npm public registry.

## §C CONSTRAINTS

- pnpm workspace monorepo, Vite+ (`vp`) toolchain, changesets for versioning.
- scoped pkgs `@batkit/*` ! publish public (npm charges for private scoped).
- node >=22, ESM+CJS dual build via `exports` map, already set per pkg.
- 5 publishable pkgs: rfc9457, errors, logger, logger-pino, express-middleware. `express-api` app excluded (already in changeset ignore).
- github repo real: `krcourville/better-application-toolkit` (git remote), but package.json/READMEs still say `YOUR_USERNAME` placeholder ∴ broken links.
- no CI workflow exists yet (`.github/workflows` empty/missing).
- no `CLAUDE.md`/`AGENTS.md` at root — agent context currently 0.

## §I INTERFACES

- cmd: `pnpm knip` → runs knip (unused files/deps/exports check) across workspace, uses root `knip.json`/`knip.jsonc`
- cmd: `pnpm publint` → validates package.json/exports map per publishable pkg (npm publish correctness)
- cmd: `pnpm attw` → @arethetypeswrong/cli, checks dual ESM/CJS type resolution per publishable pkg
- cmd: `pnpm build` → `vp run -r --cache build` (builds all pkgs)
- cmd: `pnpm test` → `vp run -r --cache test`
- cmd: `pnpm release` → build + `changeset publish`
- cmd: `npm publish` (per pkg, via changesets) → registry npmjs.com, scope `@batkit`
- file: `CLAUDE.md` (new) → root agent context: layout, commands, conventions
- file: `.github/workflows/ci.yml` (new) → lint+typecheck+test+build on PR/push
- file: `.github/workflows/release.yml` (new) → changesets publish workflow on main push
- env: `GITHUB_TOKEN` auto for changesets release PR
- auth: npm publish via OIDC Trusted Publisher (GitHub Actions), ⊥ long-lived token stored

## §V INVARIANTS

V1: ∀ publishable pkg → `package.json.repository.url` ! contain `YOUR_USERNAME`
V2: ∀ publishable pkg → `publishConfig.access` = `"public"` (scoped pkg needs explicit)
V3: CI ! run test+typecheck+lint+build on every PR before merge allowed
V4: release workflow ! publish only pkgs w/ pending changeset (via changesets/action)
V5: npm publish auth via OIDC Trusted Publisher ! (⊥ NPM_TOKEN secret, per npm's automation guidance ∵ pkgs never existed pre-B2)
V6: root `CLAUDE.md` ! exist & describe: workspace layout, `vp` commands, changeset flow, pkg boundaries
V7: first real npm publish ! be dry-run verified (`changeset publish --dry-run` or `npm publish --dry-run`) before live
V8: release workflow ! only run if CI succeeded on same commit (∵ push-triggered CI & release were independent, ⊥ ordering guaranteed)
V9: CI ! fail on any knip finding (unused files/deps/exports) not in `knip.json` ignore list
V10: `pnpm knip` locally ! reproduce exact CI knip result (same config, same command, no CI-only flags)
V11: root knip cmd ! invoke via `npx` (repo's `npx` = vite-plus per-workspace wrapper @ `~/.vite-plus/bin/npx`, silently fans out per pkg & ignores root `knip.json`) ∴ use `knip` bin direct (pnpm script / `node_modules/.bin`)
V12: CI ! fail on any publint error across 5 publishable pkgs (warnings ? allowlist per pkg)
V13: CI ! fail on any attw resolution problem across 5 publishable pkgs (unless allowlisted)
V14: publint/attw ! run against built `dist/` ∴ CI step order after build (⊥ before)

## §T TASKS

id|status|task|cites
T1|x|fix `YOUR_USERNAME` placeholder → `krcourville` in root + all 5 pkg `package.json` (repository/homepage/bugs) & READMEs|V1
T2|x|add `publishConfig.access: public` to all 5 pkg `package.json`|V2
T3|x|write root `CLAUDE.md`: layout, `vp` cmds, changeset flow, test/build/lint cmds, pkg-boundary rules|V6
T4|x|add `.github/workflows/ci.yml`: pnpm install, `vp run -r --cache lint/typecheck/test/build` on push+PR|V3,I.cmd
T5|x|add `.github/workflows/release.yml`: changesets/action, publish on merge to main, auth via OIDC (no token)|V4,V5,I.env
T6|~|`npm login` done (user: krcourville). B3: pkgs don't exist yet ∴ can't pre-configure Trusted Publisher. plan: manual first publish (T9a) creates pkgs, then configure Trusted Publisher per pkg (T9b) for future CI releases|V5,B3
T7|x|dry-run publish check all 5 pkgs (`npm publish --dry-run`) → confirm files/exports correct|V7
T8|x|no changeset needed: none of 5 pkgs ever published to npm, so `changeset publish` ships current 0.1.0 as-is. confirmed via `npx changeset publish --dry-run` (flag doesn't exist; verified per-pkg w/ `npm publish --dry-run` instead, see B2)|B2
T9a|x|user: manual first `npm publish` per pkg (dep order: rfc9457 → errors,logger → logger-pino,express-middleware), local 2FA, creates pkgs on npm. required creating `batkit` npm org first (scope didn't exist, B4)|T6,T8
T9b|x|user: configure Trusted Publisher on each pkg's npm settings → GH repo `krcourville/better-application-toolkit`, workflow `release.yml`, action `npm publish`|T9a,V5
T9c|x|pushed to main, CI green (build→check→typecheck→test all pass) & release workflow green (no-op, no pending changeset). OIDC wiring untested end-to-end until next real changeset-driven publish|T5,T9b
T10|x|update README TODO: check off "Establish CI pipeline" & "Deploy a beta release to npmjs.com"|T4,T9a
T11|x|eval knip: add as root devDep, add `knip.json`/`knip.jsonc` w/ workspace entry points (pnpm `workspaces` already set), run once & review findings across 5 pkgs+2 apps|I.cmd
T12|x|fix or allowlist T11 findings (dead exports/deps) until `pnpm knip` exits 0|T11
T13|x|add `knip` script to root `package.json` (`pnpm knip`), wire as CI step in `ci.yml` after typecheck|V9,T12
T14|x|confirm local `pnpm knip` reproduces CI result exactly (same config/cmd)|V10,T13
T15|x|eval publint+attw: add as root devDeps, run once per pkg against dist/, review findings across 5 pkgs. results: publint 0 errors all 5 (suggestions only: repo.url format, missing `sideEffects`). attw 0 problems on 4/5; `@batkit/logger` `/console`+`/async-local` subpaths fail node10 resolution (expected, exports-map subpaths predate node10 exports support; main entry green all targets)|I.cmd
T16|x|fix or allowlist T15 findings until both exit 0 across all 5 pkgs. fix: repository.url → `git+` prefix, add `"sideEffects": false` (all 5, verified no module-level side effects) fixes publint suggestions; attw node10 NoResolution on logger subpaths allowlisted via `--profile node16` (pkg requires node>=22, node10 profile irrelevant) not per-rule ignore, since only node10 fails|T15
T17|x|add `publint`/`attw` scripts to root package.json, wire as CI steps after build|V12,V13,T16
T18|.|confirm local repro matches CI exactly (recall V11: use direct bins, ⊥ `npx`)|V14,T17

## §B BUGS

id|date|cause|fix
B1|2026-07-16|5 pkg `package.json` `files` listed `LICENSE` but no per-pkg `LICENSE` file existed, only root ∴ tarballs shipped w/out license. copied root `LICENSE` → each pkg dir|V7
B2|2026-07-16|T8 assumed changeset required for initial publish. wrong: `changeset publish` only version-bumps pkgs already on npm; unpublished pkgs ship current version as-is, no changeset needed. also `changeset publish` has no `--dry-run` flag (verified per-pkg via `npm publish --dry-run` instead)|T8
B3|2026-07-16|spec assumed npm Trusted Publisher (OIDC) could be set up before first publish. wrong: npm only exposes "Trusted Publisher" config on a pkg's settings page, which only exists once pkg published once ∴ bootstrap needs 1 manual publish per pkg first, then Trusted Publisher config, then CI is tokenless|V5
B4|2026-07-16|first `npm publish` failed `E404 Scope not found` ∴ `@batkit` scope must exist as npm org before any pkg in it publishes. fix: create org at npmjs.com/org/create named `batkit`, then publish|T9a
B5|2026-07-16|CI `vp install` fails nondeterministically: `esbuild@0.28.1` postinstall gets wrong platform binary. root cause: `tsup`(0.27.7) & `vite`/`vite-plus`(0.28.1) peer-pull 2 esbuild majors in same workspace pkg ∴ pnpm parallel postinstall races on binary symlink, worse w/ no committed lockfile. fix: `pnpm.overrides.esbuild: "0.28.1"` in root `package.json` pins single version workspace-wide|V3
B6|2026-07-16|CI ran `typecheck`/`test` before `build`. `@batkit/*` pkgs resolve siblings via `dist/` (`exports` map) ∴ cross-pkg typecheck fails on clean checkout w/ no dist yet. local dev always built first so never caught. fix: reorder ci.yml → install, build, check, typecheck, test|V3
B7|2026-07-16|`ci.yml` & `release.yml` both triggered on `push: branches:[main]` independently ∴ release could publish even if CI failed, no ordering guarantee. fix: release.yml now triggers on `workflow_run` of CI, gated `if: conclusion == 'success'`, checks out CI's exact commit sha|V8
B8|2026-07-16|`npx knip` ran per-workspace via repo's vite-plus `npx` wrapper (`~/.vite-plus/bin/npx`), silently fanned out across all 7 workspaces & ignored root `knip.json` entirely. no error, exit 0, plausible-but-wrong (fewer) findings than real monorepo-aware run. fix: invoke `knip` bin direct (pnpm script / `node_modules/.bin`), ⊥ via `npx`/`pnpm dlx`|V11
