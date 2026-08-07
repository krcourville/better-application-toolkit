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

- new ref app `apps/hono-api`, sibling `apps/express-api`, mirrors it feature-for-feature but on Hono
- reuse `@batkit/errors`, `@batkit/logger`, `@batkit/logger-pino`, `@batkit/rfc9457` (framework-agnostic core)
- `@batkit/express-middleware` ⊥ reused as-is (express req/res coupled) — hono-native equiv inline in app, ⊥ new shared pkg (single consumer, YAGNI)
- routing/validation: `@hono/zod-openapi` replaces `@ts-rest/*`+`@anatine/zod-openapi`
- docs UI: `@scalar/hono-api-reference` replaces `@scalar/express-api-reference`
- `apps/hono-api` excluded from changesets, `.changeset/config.json` ignore list

## §I INTERFACES

- cmd: `pnpm --filter hono-api dev` → hot reload local server
- api: GET /health (hono-api) → 200 `{status,timestamp,uptime}`
- api: GET /openapi.json (hono-api) → 200 OpenAPI spec
- api: GET /docs (hono-api) → Scalar docs UI
- api: demo/errors/users route groups (hono-api) mirror express-api contract shape
- env: `PORT` (hono-api) optional, default 3786 (express-api uses 3785)

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
- file: `packages/{rfc9457,errors,logger,logger-pino,express-middleware}/README.md` → per-pkg usage docs, need source+issues links (V25), import examples (V26)
- file: `packages/logger/src/logger-facade.ts` → `LoggerFacade` export surface (today: configure, getLogger, getProvider, setProvider — no context-merge passthrough)
- file: `packages/logger/src/async-local*` (or equiv) → `mergeLogContext`, `getLogContext`, `runWithContext`, `ContextualLoggerProvider` exports, entry `@batkit/logger/async-local`
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
V25: every `packages/*/README.md` ! link github repo (source) + github issues (feedback/concerns) — reuse `package.json` `homepage`/`bugs` urls already present, ⊥ hand-type new ones
V26: README usage examples ! show only `import { LoggerFacade } from "@batkit/logger"` in app-logic/business-code sections — async-local/provider-specific imports (`mergeLogContext`, `ContextualLoggerProvider`, ...) confined to bootstrap/config example block, marked as such
V27: README type samples ! use inline `import("pkg").Type` syntax when type export available top-level — use plain `import type { X } from "pkg"` instead (noise, ⊥ needed since not circular-import workaround)
V28: spec'ing new public API surface ! skip check of existing `src/*.ts` interface defs for already-shipped capability — grep symbol name across `src/` before drafting a "new method" task
V29: "unused export" finding (knip/ponytail-style) against a published pkg's `src/index.ts` top-level export ! auto-trigger deletion — pkg live @ 1.0.0, removal = breaking change gated by V22 (major bump required). treat as 2.0-trim candidate, ⊥ silent cleanup

V30: ∀ req (hono-api) → request-id log context set before handler runs (mirrors express-api's `logContextMiddleware`)
V31: ∀ thrown error | validation failure (hono-api) → response body RFC 9457 problem-details shape
V32: `apps/hono-api` ⊥ has changeset — must sit in `.changeset/config.json` ignore list
V33: `apps/hono-api` ⊥ imports `@batkit/express-middleware`
V34: unmatched route (hono-api) → 404 RFC 9457 problem-details shape
V35: ∀ `OpenAPIHono` instance (hono-api, top-level | route-group) ! constructed w/ shared `defaultHook` (`src/lib/validation-hook.ts`) — `defaultHook` ⊥ propagate through `app.route()`, each mounted sub-app needs its own

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
T33|x|`pnpm changeset`: major bump all 5 pkgs → 1.0.0 in single changeset (synced version). `.changeset/v1-0-0-release.md` written, `changeset status` confirms all 5 @ major, `cli-app` patch-bump as workspace dependent expected (already precedented, @ 1.0.2)|V23
T34|x|dry-run verify (`npm publish --dry-run` per pkg) before merge, reconfirm V7 holds at 1.0. rebuilt, all 5 tarballs valid (correct dist/js+maps/package.json contents), only rejection = "cannot publish over 0.1.x" (expected, dry-run uses pre-bump version; 1.0.0 never published so real publish won't collide)|V7,T33
T35|x|merge → release workflow publishes 1.0.0 all 5 pkgs, verify via `npm view @batkit/<pkg> version`. CI green (run 29521087792), release green (run 29521153302), all 5 confirmed @ 1.0.0 live on npm|T33,T34
T36|x|audit all `packages/*/README.md`: none had repo/issues links (confirmed via grep, only unrelated `github.com/pinojs/...` doc-link hit in logger-pino)|V25
T37|x|added `## Links` section (Source + Issues, urls pulled from each pkg's own `package.json` homepage/bugs) before `## License` in all 5 `packages/*/README.md`|V25,T36
T38|x|superseded by B22: no new `LoggerFacade` passthrough needed. `Logger` instance already has `mergeContext`/`runWithContext` (`types.ts:57,64`), real when wrapped w/ `ContextualLoggerProvider`. app meat code: `LoggerFacade.getLogger(name).mergeContext(...)`, only bootstrap wires `ContextualLoggerProvider`+import from `@batkit/logger/async-local`|B22,I.logger-facade.ts,I.async-local
T39|x|`packages/express-middleware/README.md`: split "Async-local log context" example into bootstrap block (`ContextualLoggerProvider` only) + app block (`logger.mergeContext(...)` off `LoggerFacade.getLogger(...)`, no async-local import); updated API Reference prose (~line 162) same pattern|V26,V24,B22
T40|x|`packages/logger/README.md`: same bootstrap/app split in "Async-local log context" section, API Reference bullet updated to note `mergeContext`/`runWithContext` live on `Logger` itself, `getLogContext` called out as the only remaining async-local import needed outside bootstrap (no `Logger`-instance equivalent exists)|V26,V24,B22
T41|x|scanned rfc9457/errors/logger-pino README: no `import("pkg").Type` inline noise, no mid-logic `mergeLogContext`/direct async-local misuse. logger-pino's `ContextualLoggerProvider` use already bootstrap-only. no changes needed|V26,V24
T42|x|closed no-op — feature already exists, see B22. no code change needed|B22
T43|x|`packages/express-middleware/README.md` ~line 169: `initialContext?: (req: Request) => Record<string, import("@batkit/logger").LogValue>` → top-level `import type { LogValue } from "@batkit/logger"`, plain `Record<string, LogValue>` in interface|V27
T44|x|dedupe `packages/*/tsconfig.build.json`: shared `tsconfig.build.base.json`, per-pkg extends+override `lib`/`types`|
T45|x|dedupe `packages/*/vitest.config.ts`: shared base (coverage/environment/globals), per-pkg thin override|
T46|x|`apps/express-api`+`apps/cli-app` `lib/async-utils.ts`: replace hand-rolled `delay()` w/ `setTimeout` from `node:timers/promises`|
T47|x|`apps/express-api`+`apps/cli-app` `logging.ts`: confirmed intentional standalone-copyable, each app self-contained reference example (CLAUDE.md). closed no-op, no shared pkg for 2-site 25-line dupe|

T48|x|scaffold `apps/hono-api` (package.json, tsconfig.json, src/index.ts) modeled on express-api. `@hono/zod-openapi` pinned `^0.19.10` not latest `1.5.1` — 1.x requires zod4 peer, rest of repo on zod3|C
T49|x|add `hono-api` to `.changeset/config.json` ignore list|V32
T50|x|impl Hono app: health check + request-id log context middleware|I,V30
T51|x|impl RFC9457 error handling: Hono `onError`+`notFound` using `@batkit/errors`/`@batkit/rfc9457`|V31,V34
T52|x|impl demo/errors/users route groups via `@hono/zod-openapi`, mirror express-api contract shape. found+fixed B23 along the way|I,B23,V35
T53|x|wire OpenAPI JSON endpoint + `@scalar/hono-api-reference` docs UI (`Scalar` export, `apiReference` alias deprecated)|I
T54|x|wire `@batkit/logger-pino`, mirror express-api's logging.ts|C

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
B22|2026-08-07|T38 spec'd `LoggerFacade.mergeContext`/`getContext` as new work (T42) w/out checking existing `Logger` interface first. `types.ts:57,64` already declare `mergeContext(partial)`/`runWithContext(initial,fn)` on `Logger`, wired real by `ContextualLoggerProvider` (`async-local.ts:54-56`), console fallback throws w/ setup hint (`console-logger.ts:20-24`). feature already shipped, app meat code today can do `LoggerFacade.getLogger(name).mergeContext(...)` w/out any async-local import — just undocumented right in README. fix: T42 closed no-op, T39/T40 point at existing `logger.mergeContext(...)` instance method instead of a new static API|V28
B23|2026-08-07|`apps/hono-api`: passed `defaultHook` to top-level `OpenAPIHono` only. `@hono/zod-openapi`'s `defaultHook` is a constructor option, doesn't propagate through `app.route()` — each of `demoApp`/`errorsApp`/`usersApp` is its own `OpenAPIHono` instance, so a failed body/param parse on any mounted route skipped the hook entirely & leaked a raw `{success:false,error:ZodError}` shape instead of RFC9457 422 (violated V31). fix: extracted shared `validationHook` (`src/lib/validation-hook.ts`), passed `{ defaultHook: validationHook }` to all 4 `OpenAPIHono` constructors (top-level + 3 route groups)|V31
