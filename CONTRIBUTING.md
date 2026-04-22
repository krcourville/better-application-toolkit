# Contributing

This guide explains how to set up the Better Application Toolkit (BAT) monorepo locally with **Vite+** (`vp`), work on packages and reference apps, and record versionable changes with Changesets.

## Development

This monorepo is driven by **[Vite+](https://viteplus.dev/)** (`vp`): install, scripts, checks, tests, and library builds all go through the same toolchain ([`vp install`](https://viteplus.dev/guide/install), [`vp run`](https://viteplus.dev/guide/run), [`vp check`](https://viteplus.dev/guide/check), [`vp test`](https://viteplus.dev/guide/test), [`vp pack`](https://viteplus.dev/guide/pack)). The repo pins a package manager in `package.json` (`packageManager`); Vite+ delegates installs to it.

**Install the `vp` CLI** (recommended): follow [Install `vp`](https://viteplus.dev/guide/) (macOS/Linux: `curl -fsSL https://vite.plus | bash`). In CI, use [setup-vp](https://viteplus.dev/) as described on the site.

If you do not have a global `vp` yet, install it first (see above). As a one-time bootstrap, you can enable [Corepack](https://nodejs.org/api/corepack.html) and run `pnpm install` at the repo root so `vite-plus` is available, then use `pnpm exec vp <command>` for every workflow until you switch to a global `vp`.

### Prerequisites

- Node.js 22.0.0 or higher (Vite+ can also manage Node via [`vp env`](https://viteplus.dev/guide/env))
- [`vp`](https://viteplus.dev/guide/) on your `PATH` (recommended), or `pnpm exec vp` after a local install that includes `vite-plus`

### Node Version Managers

Use any Node version manager you prefer; align with `engines` in `package.json`.

#### asdf

```bash
asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git
asdf install nodejs 24.4.1
asdf set nodejs 24.4.1
node -v
vp --version
```

If `asdf set` is unavailable, create `.tool-versions` manually:

```bash
echo "nodejs 24.4.1" > .tool-versions
asdf install
node -v
vp --version
```

#### nvm

```bash
nvm install 22
nvm use 22
node -v
vp --version
```

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/better-application-toolkit.git
cd better-application-toolkit

# Install dependencies (uses the pinned package manager via Vite+)
vp install

# Build all packages (required for first-time setup)
vp run -r --cache build

# Run tests
vp run -r --cache test

# Start development server for Express reference app (root script sets LOCAL_DEV)
vp run dev
```

### Development Workflow

This monorepo uses **TypeScript Project References** for optimal development experience:

#### Development Mode

**Hot reload (recommended)**

```bash
# From the repository root (uses the root package.json "dev" script)
vp run dev
```

This runs the Express app with [`esno`](https://github.com/esbuild-kit/esno) (`esno watch`), which delegates to [`tsx`](https://github.com/privatenumber/tsx). [`vp run`](https://viteplus.dev/guide/run) starts persistent **`dev`** tasks for the `express-api` dependency chain so linked packages emit `dist/**` while you work (including **dual tsup watchers** for `@batkit/logger`). **This is the preferred way to develop.**

The root `dev` script sets `LOCAL_DEV=true`, which enables:

- Pretty-printed console logs with colors and timestamps
- Enhanced logging output for better readability during development

**To run with different log levels:**

```bash
# Default is 'info'
LOG_LEVEL=debug vp run dev
LOG_LEVEL=warn vp run dev
```

#### Production Builds

**Build for production:**

```bash
# Build all packages (cached task graph)
vp run -r --cache build

# Clean all build artifacts and rebuild
vp run -r clean && tsc --build --clean && vp run -r --cache build

# Run the production build
vp run --filter express-api start
```

#### Navigating Code

With TypeScript project references enabled:

- **Go-to-definition** takes you to the source `.ts` file, not `.d.ts` declarations
- **IntelliSense** works across packages
- Changes in dependent packages are automatically detected

#### TypeScript Project References

The monorepo is configured with composite builds:

- Each package has `"composite": true` in its `tsconfig.json`
- Dependencies between packages are declared via `"references"`
- The root `tsconfig.json` orchestrates the whole workspace
- `tsc --build` performs incremental, dependency-aware compilation

#### Common Development Tasks

**Making changes to a package:**

```bash
vp run dev
```

**Testing your changes:**

```bash
# Run tests for all packages
vp run -r --cache test

# Run tests for a specific package
vp run --filter @batkit/errors test

# Watch mode for TDD (root script runs `vp test -w`)
vp run test:watch
```

**Building for production:**

```bash
# Build everything
vp run -r --cache build

# Build and run production server
vp run -r --cache build && vp run --filter express-api start
```

**Adding a new dependency to a package:**

```bash
cd packages/logger
vp add some-package
vp add @batkit/errors@workspace:*
```

See [`vp add` / `vp install`](https://viteplus.dev/guide/install) for workspace-wide options.

**Troubleshooting:**

```bash
# Nuclear clean (root "clean" script: removes root node_modules, lockfile, then cleans all packages)
vp run clean
vp install

# Clean only build artifacts, then full rebuild
vp run build:clean
vp run build

# Free the default express-api port (3785)
vp run stop-server
```

### Project Structure

```
better-application-toolkit/
├── packages/              # Published packages
│   ├── rfc9457/          # RFC 9457 schemas
│   ├── errors/           # Standardized errors
│   ├── logger/           # Logger facade
│   ├── logger-pino/      # Pino implementation
│   └── express-middleware/ # Express utilities
├── apps/                 # Reference applications
│   ├── express-api/      # Express.js example
│   └── cli-app/          # CLI demo
├── .changeset/           # Changesets for versioning
└── .github/              # GitHub Actions workflows
```

### Available commands (Vite+)

Run these from the **repository root**. They map to [`package.json`](./package.json) scripts, which are implemented with `vp` ([`vp run`](https://viteplus.dev/guide/run), [`vp check`](https://viteplus.dev/guide/check), [`vp test`](https://viteplus.dev/guide/test)).

| Command | Purpose |
| --- | --- |
| `vp install` | Install dependencies (delegates to the pinned package manager) |
| `vp run dev` | Express reference app with hot reload and workspace watchers |
| `vp run build` | Production build for all packages and apps |
| `vp run build:clean` | Runs `vp run -r clean`, then root `tsc --build --clean` |
| `vp run test` | Run all package tests |
| `vp run test:watch` | Tests in watch mode (`vp test -w`) |
| `vp check` | Format, lint, and type-check ([`vp check`](https://viteplus.dev/guide/check)) |
| `vp run check`, `vp run lint` | Same as `vp check` (script aliases) |
| `vp run lint:fix` | `vp check --fix` |
| `vp run typecheck` | `tsc --noEmit` in every workspace package |
| `vp run cli` | Build and run the `cli-app` demo |
| `vp run release` | Build, then Changesets publish |
| `vp run changeset` | Interactive Changesets CLI |
| `vp run version-packages` | Apply version bumps from changesets |
| `vp run clean` | Remove root `node_modules` and lockfile, then clean all packages |
| `vp run stop-server` | Kill anything listening on port **3785** |

Inside an individual package directory you can still use **`vp pack`**, **`vp test`**, or **`vp check`** directly; the table above covers the usual **root** workflows.

## Adding a Changeset

When making changes to packages, add a changeset:

```bash
vp run changeset
```

Follow the prompts to describe your changes. This helps automate versioning and changelog generation.
