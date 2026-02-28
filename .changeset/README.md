# Changesets

This folder contains changesets - files that describe changes to packages in this monorepo.

## What are changesets?

Changesets are a way to manage versions and changelogs with a focus on monorepos. When you make changes to packages, you create a changeset file that describes:

- Which packages changed
- What type of change it was (major, minor, or patch)
- A summary of the changes

## How to create a changeset

When you make changes to any package, run:

```bash
npm run changeset
```

Follow the prompts to:
1. Select which packages have changed
2. Choose the type of version bump (major/minor/patch)
3. Write a summary of the changes

This will create a markdown file in this directory describing your changes.

## How versions are determined

When it's time to release, run:

```bash
npm run version-packages
```

This will:
- Read all changeset files
- Update package.json versions based on the changesets
- Update CHANGELOGs
- Delete the consumed changeset files

Then to publish:

```bash
npm run release
```

This will build and publish all changed packages to npm.
