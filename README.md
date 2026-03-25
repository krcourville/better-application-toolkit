# 🦇 Better Application Toolkit (BAT)

A comprehensive, production-ready toolkit for building observable and reliable Node.js applications and APIs.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](https://nodejs.org)

## Overview

Better Application Toolkit (BAT) is a suite of TypeScript packages designed to improve observability, reliability, and developer experience for Node.js web applications. All packages are designed to work in both Node.js and browser environments (where applicable).

## Documentation

- **[Understanding AsyncLocalStorage](./docs/async-local-storage.md)** — how ALS works, use cases, pitfalls, and how BAT uses it for logging.
- Logging pitfalls and patterns: see [@batkit/logger](./packages/logger/README.md) and the AsyncLocalStorage guide above.

## Packages

### Core Packages

- **[@batkit/rfc9457](./packages/rfc9457)** - Zod schemas and types for RFC 9457 (Problem Details for HTTP APIs)
- **[@batkit/errors](./packages/errors)** - Standardized error classes with structured troubleshooting information
- **[@batkit/logger](./packages/logger)** - Logger facade with default console implementation

### Framework Adapters

- **[@batkit/logger-pino](./packages/logger-pino)** - Pino.js implementation of the logger facade (works in browser and Node.js)
- **[@batkit/express-middleware](./packages/express-middleware)** - Express.js middleware for error handling and request context (Node.js only)

## Reference Applications

- **[Express API](./apps/express-api)** - Production-ready Express.js application demonstrating all BAT packages

## Features

✨ **Universal Design** - Most packages work in both Node.js and browser environments
🎯 **Type-Safe** - Full TypeScript support with exported types
📦 **Dual Module Format** - ESM and CommonJS builds for maximum compatibility
🧪 **Well Tested** - Comprehensive test coverage with Vitest
📚 **Standards-Based** - Implements RFC 9457 for standardized error responses
🔍 **Observable** - Built-in structured logging and request context tracking
⚡ **Modern** - Leverages AsyncLocalStorage and other modern Node.js features

## Quick Start

### Installation

Install the packages you need:

```bash
pnpm add @batkit/logger @batkit/errors @batkit/express-middleware
```

### Basic Usage

```typescript
import { LoggerFacade } from '@batkit/logger';
import { ContextualLoggerProvider } from '@batkit/logger/async-local';
import { PinoLoggerProvider } from '@batkit/logger-pino';
import { NotFoundError } from '@batkit/errors';
import { errorHandler, logContextMiddleware } from '@batkit/express-middleware';
import express from 'express';
import { randomUUID } from 'node:crypto';

LoggerFacade.setProvider(new ContextualLoggerProvider(new PinoLoggerProvider({ level: 'info' })));

const app = express();
app.use(express.json());
app.use(
  logContextMiddleware({
    initialContext: (req) => ({ requestId: req.get('x-request-id') ?? randomUUID() }),
  }),
);

// Your routes
app.get('/users/:id', (req, res) => {
  const user = findUser(req.params.id);
  if (!user) {
    throw new NotFoundError('User', req.params.id);
  }
  res.json(user);
});

// Add error handler (must be last)
app.use(errorHandler());

app.listen(3000);
```

## Development

### Prerequisites

- Node.js 22.0.0 or higher
- pnpm 9.0.0 or higher

### Node Version Managers

This repo uses pnpm workspaces with the `workspace:*` protocol, which is natively supported in pnpm.

#### asdf

```bash
asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git
asdf install nodejs 24.4.1
asdf set nodejs 24.4.1
node -v
pnpm -v
```

If `asdf set` is unavailable, create `.tool-versions` manually:

```bash
echo "nodejs 24.4.1" > .tool-versions
asdf install
node -v
pnpm -v
```

#### nvm

```bash
nvm install 22
nvm use 22
node -v
pnpm -v
```

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/better-application-toolkit.git
cd better-application-toolkit

# Install pnpm globally (if not already installed)
npm install -g pnpm@9

# Install dependencies
pnpm install

# Build all packages (required for first-time setup)
pnpm build

# Run tests
pnpm test

# Start development server for Express reference app
pnpm dev
```

### Development Workflow

This monorepo uses **TypeScript Project References** for optimal development experience:

#### Development Mode

**Hot reload (recommended)**
```bash
# express-api runs from TypeScript via esno (`tsx` under the hood); workspace libraries rebuild with tsup --watch
pnpm dev
```
This runs the Express app with [`esno`](https://github.com/esbuild-kit/esno) (`esno watch`), which delegates to [`tsx`](https://github.com/privatenumber/tsx). Turborepo also starts persistent **`dev`** (and **`dev:async-local`** for `@batkit/logger`) so linked packages emit `dist/**` while you work. **This is the preferred way to develop.**

The `pnpm dev` script automatically sets `LOCAL_DEV=true`, which enables:
- Pretty-printed console logs with colors and timestamps
- Enhanced logging output for better readability during development

**To run with different log levels:**
```bash
# Default is 'info'
LOG_LEVEL=debug pnpm dev
LOG_LEVEL=warn pnpm dev
```

#### Production Builds

**Build for production:**
```bash
# Build all packages with TypeScript project references
pnpm build

# Clean all build artifacts and rebuild
pnpm build:clean && pnpm build

# Run the production build
pnpm --filter express-api start
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
# Start development (esno + Turbo package watchers)
pnpm dev
```

**Testing your changes:**
```bash
# Run tests for all packages
pnpm test

# Run tests for a specific package
pnpm --filter @batkit/errors test

# Watch mode for TDD
pnpm test:watch
```

**Building for production:**
```bash
# Build everything
pnpm build

# Build and run production server
pnpm build && pnpm --filter express-api start
```

**Adding a new dependency to a package:**
```bash
# Navigate to the package
cd packages/logger

# Add the dependency
pnpm add some-package

# Or add a workspace dependency
pnpm add @batkit/errors@workspace:*
```

**Troubleshooting:**

If you encounter issues:
```bash
# Clean everything and reinstall
pnpm clean
pnpm install

# Clean only build artifacts
pnpm build:clean

# Rebuild everything from scratch
pnpm build:clean && pnpm build

# Kill server if the reference app port (default 3785) is busy
pnpm stop-server
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
│   └── express-api/      # Express.js example
├── .changeset/           # Changesets for versioning
└── .github/              # GitHub Actions workflows
```

### Available Scripts

**Development**
- `pnpm dev` - Run Express reference app with hot reload (esno + Turbo watchers for workspace packages)

**Building**
- `pnpm build` - Build all packages with TypeScript project references
- `pnpm build:clean` - Clean all build artifacts

**Testing & Quality**
- `pnpm test` - Run all tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm lint` - Lint all code
- `pnpm lint:fix` - Lint and auto-fix issues
- `pnpm format` - Format all code with Biome
- `pnpm typecheck` - Type check all packages

**Utilities**
- `pnpm stop-server` - Kill any process on the express-api default port (3785; matches `PORT` in `.env`)
- `pnpm changeset` - Create a new changeset for versioning
- `pnpm clean` - Remove all node_modules and lockfiles

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

### Adding a Changeset

When making changes to packages, add a changeset:

```bash
pnpm changeset
```

Follow the prompts to describe your changes. This helps automate versioning and changelog generation.

## License

MIT © Ken Courville

## Learn More

- [RFC 9457 - Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457.html)
- [Express.js Documentation](https://expressjs.com/)
- [Pino Logger](https://getpino.io/)
- [Changesets](https://github.com/changesets/changesets)
