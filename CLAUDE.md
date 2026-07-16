# CLAUDE.md

pnpm workspace monorepo. `@batkit/*` observability/reliability pkgs for Node.js. Full human onboarding: [CONTRIBUTING.md](./CONTRIBUTING.md).

## Layout

```
packages/          publishable @batkit/* pkgs
  rfc9457/          RFC 9457 problem-details schemas (zod)
  errors/           standardized error classes, depends rfc9457
  logger/            logger facade + console impl, dual export (main + /console + /async-local)
  logger-pino/       pino impl of logger facade, depends logger
  express-middleware/ express error/context middleware, depends errors+logger+rfc9457
apps/               reference apps, NOT published
  express-api/       full demo, excluded from changesets (.changeset/config.json ignore list)
  cli-app/           minimal logger demo
.changeset/         changesets config + pending changesets
.github/workflows/   CI + release automation
docs/               observability recommendations, AsyncLocalStorage guide
```

Dependency order (build/test respects this): `rfc9457` → `errors`/`logger` → `logger-pino`/`express-middleware`.

## Commands (all via `vp`, root)

- `pnpm build` / `vp run -r --cache build` — build all pkgs
- `pnpm test` / `vp run -r --cache test` — test all pkgs
- `vp run --filter @batkit/<name> test` — single pkg test
- `pnpm typecheck` — `tsc --noEmit` per pkg
- `pnpm check` / `pnpm lint` — format+lint+typecheck (`vp check`)
- `pnpm lint:fix` — `vp check --fix`
- `pnpm dev` — express-api hot reload + workspace watchers
- `pnpm changeset` — record versionable change (required for any pkg edit meant to ship)
- `pnpm release` — build + `changeset publish`

## Conventions

- Each pkg: dual ESM+CJS via `exports` map in `package.json`, built to `dist/`. Don't hand-edit `dist/`.
- `@batkit/*` deps between workspace pkgs use `workspace:*`.
- Every pkg `package.json` carries `publishConfig.access: public` — scoped pkgs default private on npm else.
- Changing a publishable pkg → add changeset (`pnpm changeset`) before merge, or release workflow has nothing to publish.
- `apps/*` never gets a changeset — `.changeset/config.json` `ignore` list enforces this for `express-api`; `cli-app` has no package changes expected either.
- Tests: Vitest, colocated per pkg (`vp test`).
- TS project references: composite builds, `tsc --build` incremental. Go-to-def hits `.ts` source not `.d.ts`.

## SPEC.md

Repo tracks work via `SPEC.md` at root (cavekit format: §G goal, §C constraints, §I interfaces, §V invariants, §T tasks, §B bugs). Check it before large changes — invariants in §V are load-bearing and CI/review will hold code to them.
