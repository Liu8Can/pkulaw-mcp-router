# Release Guide

This file documents the normal update and publish workflow for `pkulaw-mcp-router`.

## 1. Make changes

Update source code, docs, config examples, or catalog files as needed.

Recommended checks:

```bash
npm run build
npm run inspect -- --config ./config.example.toml
```

## 2. Bump the version

An npm package version cannot be published twice.  
Before every new release, update the version in `package.json`.

Recommended commands:

```bash
npm version patch
```

or:

```bash
npm version minor
npm version major
```

Versioning suggestion:

- `patch` — docs, fixes, small changes
- `minor` — new features, new supported services, non-breaking improvements
- `major` — breaking changes

## 3. Commit and push

```bash
git add .
git commit -m "release: vX.Y.Z"
git push origin main
git push origin --tags
```

## 4. Publish to npm

If already logged in:

```bash
npm publish
```

If using `npx`, users can then immediately install the latest version:

```bash
npx -y pkulaw-mcp-router@latest
```

## 5. Verify

```bash
npm view pkulaw-mcp-router version
```

And confirm the package page:

- `https://www.npmjs.com/package/pkulaw-mcp-router`

## Notes

- Keep `README.md` and `README.en.md` in sync
- Keep `catalog/pkulaw-services.generated.json` current if the public catalog changes
- If package metadata changes, check `package.json` before publishing
