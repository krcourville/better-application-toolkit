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
- file: `.github/workflows/release.yml` (new) → direct version+publish on main after CI success, no review PR (V4)
- env: `GITHUB_TOKEN` auto for changesets release PR
- auth: npm publish via OIDC Trusted Publisher (GitHub Actions), ⊥ long-lived token stored

## §V INVARIANTS

V1: ∀ publishable pkg → `package.json.repository.url` ! contain `YOUR_USERNAME`
V2: ∀ publishable pkg → `publishConfig.access` = `"public"` (scoped pkg needs explicit)
V3: CI ! run test+typecheck+lint+build on every PR before merge allowed
V4: release workflow ! publish only pkgs w/ pending changeset. version+publish direct on `main` in 1 run (`changeset version` → commit+push → `changeset publish`), ⊥ intermediate "Version Packages" review PR (GH Actions ⊥ permitted create PRs on this repo, no branch protection on `main` blocking direct push anyway)
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
V15: ci.yml ! invoke workspace-tool scripts (publint/attw/knip) via `vp run <script>` (⊥ bare `pnpm <script>`) ∵ `setup-vp` action puts `vp` on PATH but ⊥ bare `pnpm` binary; raw `pnpm` steps fail `command not found`
V16: pnpm-lock.yaml ! git-ignored ∴ commit @ repo root. deterministic installs, CI cache works, closes B5 gap
V17: error-handler log call ! include raw `req.body` when body binary (Buffer or non-JSON content-type) — log content-type+length instead
V18: error-handler response ! gate stack trace behind `includeStack` option — stack always included, option removed from `ErrorHandlerOptions` type (breaking change, ⊥ env-based toggle)
V19: zod validation error format ! return 400 — use 422 (Unprocessable Entity); request syntactically valid, semantically invalid
V20: all validation-error response paths ! same status — thrown `ValidationError` class & zod-driven `formatZodError` both ! return 422, ⊥ diverge by which code path caught the failure
V21: any error-formatting middleware wrapping ts-rest routes (e.g. `res.json` patch) ! register BEFORE `createExpressEndpoints()` — ts-rest handlers respond direct via `res.json()` w/out calling `next()`, middleware added after registration never fires for matched routes
V22: v1.0.0 ! signal public API stability commitment — breaking change post-1.0 ! major bump (semver)
V23: all 5 pkgs ! release 1.0.0 together in 1 changeset (synced versioning, ⊥ mixed 0.x/1.x across workspace)
V24: each pkg README code sample ! reference only symbols present in that pkg's `src/index.ts` exports — check README against exports whenever a breaking-change changeset touches public API

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
T18|x|confirm local repro matches CI exactly (recall V11: use direct bins, ⊥ `npx`). ran exact ci.yml step order locally (build→publint→attw→check→typecheck→knip→test), all exit 0, identical to CI job. scripts use `./node_modules/.bin/` direct, no `npx`|V14,T17
T19|x|end-to-end real PR test: fix log-field typo bug in `express-middleware/src/error-handler.ts:203-204` (`querd: req.method` dup key, `consoley: req.query` typo → both should be `query: req.query`, drop dup). branch → fix → `pnpm changeset` → PR → CI green → merge → release workflow publishes patch to npm. full cycle confirmed: PR #1 merged, `@batkit/express-middleware` 0.1.0→0.1.1 published, verified via `npm view`. surfaced B10, B11 along the way|B9,B10,B11
T20|x|un-ignore `pnpm-lock.yaml` in `.gitignore`, `pnpm install` generate lockfile, commit to repo root. verified: pushed, CI green, "Auto-detected lock file" replaces prior "No lock file found" warning|V16,B12
T21|x|error-handler: skip raw `req.body` log on binary payload (Buffer/non-JSON content-type), log content-type+length instead|V17,B13
T22|x|remove `includeStack` from `ErrorHandlerOptions`, hardcode stack always added to problem-details response|V18
T23|x|change `formatZodError` status 400→422|V19,B14
T24|x|`errors` pkg: `ValidationError.toRFC9457()` + `AppError` super status 400→422, align thrown-class path w/ zod-driven 422 (T23)|V20,B15
T25|x|`express-middleware` error-handler.ts: broaden binary-body guard to check content-type header too (⊥ just `Buffer.isBuffer`), match V17 wording|V17,B16
T26|x|`apps/express-api`: reorder RFC9457 ts-rest interceptor middleware before `createExpressEndpoints()`, or refactor off `res.json` patch pattern|V21,B17
T27|x|`apps/express-api` demo/fulfillment-pipeline: add rollback (compensating deduction) on partial-order failure|B18
T28|x|`apps/express-api` users/handlers: replace `users.size+1` id gen w/ monotonic counter or `randomUUID`|B19
T29|x|`apps/express-api`+`cli-app` lib/async-utils.ts: fix missing template-literal backticks in delay log line|B20
T30|x|API surface freeze review: audit each pkg `src/index.ts` exports (errors:22, rfc9457:11, logger:4, logger-pino:2, express-middleware:2) for rename/remove before 1.0 lock-in. all 5 surfaces clean, consistent naming, minimal — no changes needed|V22
T31|x|README.md: line ~115 still said "Deploy a beta release" — kept as historical done item, added new TODO line "Publish 1.0.0 stable release"|V22
T32|x|verify each pkg README + CHANGELOG.md reflect current API, no stale pre-1.0 examples. found+fixed B21: logger-pino README fabricated API, errors README stale AppError ctor + wrong toJSON claim + typo, express-middleware README unexported RequestContext type|V22,B21
T33|.|`pnpm changeset`: major bump all 5 pkgs → 1.0.0 in single changeset (synced version)|V23
T34|.|dry-run verify (`npm publish --dry-run` per pkg) before merge, reconfirm V7 holds at 1.0|V7,T33
T35|.|merge → release workflow publishes 1.0.0 all 5 pkgs, verify via `npm view @batkit/<pkg> version`|T33,T34

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
B9|2026-07-16|express-middleware error-handler logs error context w/ typo'd keys: `querd: req.method` (dup of `method`, wrong name) & `consoley: req.query` (typo, should be `query`). `req.query` never logged under correct key ∴ structured logs missing query params on unhandled errors. fix: T19|T19
B10|2026-07-16|CI broken on `main` since T17 (3 consecutive pushes failed, incl. unrelated PR): `ci.yml` steps `pnpm publint`/`pnpm attw`/`pnpm knip` fail `command not found`. `setup-vp` action exposes `vp` on PATH, ⊥ bare `pnpm` binary ∴ any raw `pnpm <script>` CI step fails, only `vp run <script>`/`vp <cmd>` steps work. fix: ci.yml steps → `vp run publint`/`vp run attw`/`vp run knip`|V15
B11|2026-07-16|first real changeset-driven release (T19's PR, 2 pending changesets) failed: `changesets/action` tried open "Version Packages" review PR, got `HttpError: GitHub Actions is not permitted to create or approve pull requests`. earlier release runs looked green but were no-op (0 pending changesets, nothing to gate). fix: dropped changesets/action's PR-gate flow entirely; release.yml now runs `changeset version` → commit+push direct to `main` → `changeset publish` in 1 job, since `main` has no branch protection requiring PR review|V4
B12|2026-07-16|`.gitignore` ignored `pnpm-lock.yaml` (line 6) ∴ no lockfile committed. root cause behind B5 (esbuild version race, no pin) & separately: CI `setup-vp` cache step keys off lockfile hash, none present ⇒ cache never restores/saves, full cold install every run (observed warning "No lock file found in project directory"). fix: un-ignore, `pnpm install` generate, commit|V16
B13|2026-07-16|error-handler unconditional `body: req.body` log includes binary payloads (Buffer/multipart) in structured error logs, bloats/corrupts log output|V17
B14|2026-07-16|`formatZodError` returned 400 (Bad Request) for validation errors; wrong per RFC 9457 convention — body syntactically parseable, only semantic validation failed, should be 422 (Unprocessable Entity)|V19
B15|2026-07-16|`ValidationError.toRFC9457()` (`errors/src/index.ts:114-122`) hardcode status 400. T23 fixed zod-driven path (`formatZodError`) 400→422 but `ValidationError` class thrown direct still 400 ∴ same failure class, 2 status codes depending on which path catches it|V20
B16|2026-07-16|`error-handler.ts:198-201` binary-body guard checks `Buffer.isBuffer(req.body)` only. V17 wording ! "Buffer or non-JSON content-type" — non-Buffer non-JSON body (e.g. `text/plain`, urlencoded edge case) still logged raw under `body:` key|V17
B17|2026-07-16|`apps/express-api/src/app.ts` RFC9457 interceptor middleware (`res.json` monkeypatch, ~line 89) registered AFTER `createExpressEndpoints(apiContract, router, app)`. ts-rest route handlers call `res.json()` direct w/out `next()` ∴ middleware never runs for matched routes, real validation failures leak raw ZodError shape instead of problem+json|V21
B18|2026-07-16|`apps/express-api` demo/fulfillment-pipeline.ts `#reserveLine` per-item stock deduction, no rollback on partial-order failure. item 2/3 fails after item 1 deducted ∴ inventory permanently corrupted (demo-only, no invariant)|T27
B19|2026-07-16|`apps/express-api` users/handlers.ts:98 `id = String(users.size+1)`. delete+create ∴ id collision w/ existing user (demo-only, no invariant)|T28
B20|2026-07-16|`apps/express-api` src/lib/async-utils.ts:5 missing template-literal backticks, logs literal `"Delaying for ${ms}ms"` not interpolated ms value (`cli-app` sibling copy correct, `express-api` copy has typo)|T29
B21|2026-07-16|`packages/logger-pino/README.md` documented fictional API (`createPinoLogger`/`createDevLogger`/`createProdLogger`/`PinoLoggerFactory`/`PinoLoggerAdapter`) — none exist in `src/index.ts`, real exports are `PinoLoggerProvider`+`adaptPinoToBatkitLogger`. also `errors/README.md` showed pre-0.1.3 `AppError(status, msg, code?, details?, isOperational?)` ctor (actual: options object per 0.1.3 changeset) & wrong "stack in non-production" `toJSON()` claim; `express-middleware/README.md` documented unexported `RequestContext` type. root cause: READMEs hand-written once, never re-synced after breaking API changes (0.1.1-0.1.3 changesets)|T32,V22
