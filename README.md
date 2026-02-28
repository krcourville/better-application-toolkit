# 🦇 Better Application Toolkit (BAT)

A comprehensive, production-ready toolkit for building observable and reliable Node.js applications and APIs.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](https://nodejs.org)

## Overview

Better Application Toolkit (BAT) is a suite of TypeScript packages designed to improve observability, reliability, and developer experience for Node.js web applications. All packages are designed to work in both Node.js and browser environments (where applicable).

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
import { createConsoleLogger } from '@batkit/logger';
import { NotFoundError } from '@batkit/errors';
import { errorHandler, contextMiddleware } from '@batkit/express-middleware';
import express from 'express';

const app = express();
const logger = createConsoleLogger();

// Add request context middleware
app.use(contextMiddleware({ logger }));

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
asdf install nodejs 22.11.0
asdf set nodejs 22.11.0
node -v
pnpm -v
```

If `asdf set` is unavailable, create `.tool-versions` manually:

```bash
echo "nodejs 22.11.0" > .tool-versions
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

# Build all packages
pnpm build

# Run tests
pnpm test

# Start development server for Express reference app
pnpm dev:express
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

- `pnpm build` - Build all packages
- `pnpm test` - Run all tests
- `pnpm lint` - Lint all code
- `pnpm format` - Format all code
- `pnpm typecheck` - Type check all packages
- `pnpm dev:express` - Run Express reference app in watch mode
- `pnpm changeset` - Create a new changeset for versioning

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
