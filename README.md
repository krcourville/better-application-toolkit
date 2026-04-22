# 🦇 Better Application Toolkit (BAT)

A comprehensive, production-ready toolkit for building observable and reliable Node.js applications and APIs.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](https://nodejs.org)

## Motivation

Do you ever find yourself in these scenarios?

- "My application is breaking and I don't know why."
- "It is taking me way too long to resolve incidents. How do I improve MTTR (Mean Time to Resolve)?"
- "I want to be more proactive and address issues before a customer reports them."
- "I need to know the usage patterns of my application so that I can prioritize work for maximum ROI."
- "We shipped a fix but still cannot prove in production that latency or errors actually improved."
- "Two services disagree on what happened for the same request, and we have no shared request id or trace to reconcile them."
- "Our logs are a wall of text; finding one user's session or one bad deploy takes forever."

Observability is how you answer those questions with evidence instead of guesses. Better Application Toolkit helps in two ways:

1. **Documentation** that captures recommendations and patterns you can adopt deliberately
2. **Libraries** you can wire into your app so those practices are easier to ship and keep consistent.

## Overview

Better Application Toolkit (BAT) is a suite of TypeScript packages designed to improve observability, reliability, and developer experience for Node.js web applications. All packages are designed to work in both Node.js and browser environments (where applicable).

## Documentation

- **[Observability recommendations](./docs/recommendations.md)** — MELT framing, logging practices, and how traces and metrics fit alongside BAT.
- **[Understanding AsyncLocalStorage](./docs/async-local-storage.md)** — how ALS works, use cases, pitfalls, and how BAT uses it for logging.
- Package specifics: [@batkit/logger](./packages/logger/README.md), [@batkit/express-middleware](./packages/express-middleware/README.md), and the AsyncLocalStorage guide above.

## Packages

### Core Packages

- **[@batkit/rfc9457](./packages/rfc9457)** - Zod schemas and types for RFC 9457 (Problem Details for HTTP APIs)
- **[@batkit/errors](./packages/errors)** - Standardized error classes with structured troubleshooting information
- **[@batkit/logger](./packages/logger)** - Logger facade with default console implementation

### Framework Adapters

- **[@batkit/logger-pino](./packages/logger-pino)** - Pino.js implementation of the logger facade (works in browser and Node.js)
- **[@batkit/express-middleware](./packages/express-middleware)** - Express.js middleware for error handling and request context (Node.js only)

## Reference Applications

- **[Express API](./apps/express-api)** — production-ready Express.js app demonstrating all BAT packages
- **[CLI app](./apps/cli-app)** — minimal terminal demo of the logger stack (`vp run cli` from the repo root)

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

Install the packages you need (npm, pnpm, yarn, or in a [Vite+](https://viteplus.dev/) project, `vp add`):

```bash
pnpm add @batkit/logger @batkit/errors @batkit/express-middleware
```

### Basic Usage

```typescript
import { LoggerFacade } from "@batkit/logger";
import { ContextualLoggerProvider } from "@batkit/logger/async-local";
import { PinoLoggerProvider } from "@batkit/logger-pino";
import { NotFoundError } from "@batkit/errors";
import { errorHandler, logContextMiddleware } from "@batkit/express-middleware";
import express from "express";
import { randomUUID } from "node:crypto";

LoggerFacade.setProvider(new ContextualLoggerProvider(new PinoLoggerProvider({ level: "info" })));

const app = express();
app.use(express.json());
app.use(
  logContextMiddleware({
    initialContext: (req) => ({ requestId: req.get("x-request-id") ?? randomUUID() }),
  }),
);

// Your routes
app.get("/users/:id", (req, res) => {
  const user = findUser(req.params.id);
  if (!user) {
    throw new NotFoundError("User", req.params.id);
  }
  res.json(user);
});

// Add error handler (must be last)
app.use(errorHandler());

app.listen(3000);
```

## TODO

-[X] Bootstrap project
-[X] Bootstrap libraries and reference apps
-[X] Add documentation of recommendations
-[ ] Establish CI pipeline
-[ ] Deploy a beta release to npmjs.com

## Contributing

We welcome contributions. See [CONTRIBUTING.md](./CONTRIBUTING.md) for local development with **Vite+** (`vp`), workspace layout, common commands, and adding a changeset when you change packages.

## License

MIT © Ken Courville

## Learn More

- [Vite+](https://viteplus.dev/) — unified `vp` toolchain (install, run, check, test, pack)
- [RFC 9457 - Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457.html)
- [Express.js Documentation](https://expressjs.com/)
- [Pino Logger](https://getpino.io/)
- [Changesets](https://github.com/changesets/changesets)
