# NPM Scripts

Root `package.json` scripts, run via `pnpm <script>`. See [CLAUDE.md](./CLAUDE.md) for repo layout.

| script                    | intent                                                                                                                                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build`                   | Build every workspace pkg/app (`vp run -r --cache build`), dependency-order aware, cached.                                                                                                          |
| `build:clean`             | Wipe all `dist/` + tsc incremental state, then rebuild from scratch. Use when caches lie.                                                                                                           |
| `test`                    | Run every pkg's Vitest suite (`vp run -r --cache test`).                                                                                                                                            |
| `test:watch`              | Vitest in watch mode against the current dir (run inside a pkg).                                                                                                                                    |
| `check` / `lint`          | Format + lint + typecheck everything (`vp check`). Same check CI runs.                                                                                                                              |
| `lint:fix`                | `check`, auto-fixing what's fixable.                                                                                                                                                                |
| `typecheck`               | `tsc --noEmit` per pkg, cached.                                                                                                                                                                     |
| `knip`                    | Find unused files/exports/deps across the workspace.                                                                                                                                                |
| `publint`                 | Validate `package.json`/`exports` correctness (publish-readiness). `vp run -r --cache publint` — runs each pkg's own `publint` script; a pkg only gets checked if it opts in (see below).           |
| `attw`                    | Check dual ESM/CJS type resolution (`@arethetypeswrong/cli`). `vp run -r --cache attw` — same opt-in mechanism as `publint`.                                                                        |
| `dev:express-api`         | Run `apps/express-api` with hot reload (port 3785) + watch-build its workspace deps. Multi-package watch orchestration can hang in some environments — if it does, use `start:express-api` instead. |
| `dev:hono-api`            | Run `apps/hono-api` with hot reload (port 3786) + watch-build its workspace deps. Same caveat as `dev:express-api`.                                                                                 |
| `start:express-api`       | Build once (no watch), then run `apps/express-api` from `dist/`. The reliable "just run it" path.                                                                                                   |
| `start:hono-api`          | Build once (no watch), then run `apps/hono-api` from `dist/`. The reliable "just run it" path.                                                                                                      |
| `stop-server:express-api` | Kill whatever is listening on port 3785 (express-api's default port).                                                                                                                               |
| `stop-server:hono-api`    | Kill whatever is listening on port 3786 (hono-api's default port).                                                                                                                                  |
| `cli`                     | Build + run `apps/cli-app` (minimal logger demo, no HTTP server).                                                                                                                                   |
| `changeset`               | Record a versionable change for a pkg you're about to ship.                                                                                                                                         |
| `version-packages`        | Apply pending changesets (bump versions, update changelogs).                                                                                                                                        |
| `release`                 | Build everything, then `changeset publish` — ships pkgs with a pending changeset.                                                                                                                   |

## `publint`/`attw`: per-package opt-in, not a hardcoded list

`publint`/`attw` only apply to publishable packages (`apps/*` are reference apps, never published — see `.changeset/config.json`'s `ignore` list). Rather than hardcode that package list in the root script, each publishable `packages/*/package.json` carries its own `publint`/`attw` script:

```json
"publint": "publint .",
"attw": "attw --pack . --profile node16"
```

The root scripts are just `vp run -r --cache publint` / `vp run -r --cache attw` — same pattern as `build`/`test`/`typecheck`. `vp run -r` runs a script across every workspace pkg that defines it and silently skips the ones that don't (`apps/*`, `cli-app`). Adding a new publishable package means adding these two lines to its own `package.json`; the root script never changes.
