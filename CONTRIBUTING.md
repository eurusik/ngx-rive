# Contributing

Thanks for wanting to help. This is a small pre-release library with a single
maintainer; the setup is meant to be fast to onboard.

## Prerequisites

- Node.js **20.19** or newer (earlier versions break `ng-packagr`'s ESM
  `require`).
- npm 10+.

## First-time setup

```bash
git clone https://github.com/eurusik/ngx-rive.git
cd ngx-rive
npm install --legacy-peer-deps
```

`--legacy-peer-deps` is temporarily needed because Nx 20 declares strict
Angular 20 peers that some transitive deps haven't caught up with yet.

Install the Playwright browsers once:

```bash
npx playwright install chromium firefox webkit
```

## Day-to-day

```bash
npm run serve        # SSR playground on http://localhost:4200
npm run test:lib     # jest unit + integration (fast, < 10s)
npm run test:e2e     # full Playwright matrix (~3 min)
npm run build:lib    # produce dist/packages/ngx-rive
```

A workspace-wide ESLint setup isn't wired yet for the alpha — follow the Angular 20 idioms listed below and lean on TypeScript's strict mode plus the existing clean-code audits.

## Submitting a PR

1. Branch from `main`.
2. Add tests — unit for internal logic, e2e for user-facing behavior.
3. Keep the commit surface tight: one concern per PR is easier to review than
   one big "fixes".
4. Update `CHANGELOG.md` under `[Unreleased]` unless it's a docs-only change.
5. Make sure CI is green locally before pushing — the workflow is defined in
   [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## What to work on

Open issues are the source of truth. If you want to propose something not
filed yet, open a Feature Request issue first so we can discuss scope before
code.

## Code style

- Strict TypeScript across the workspace — no `any` without a comment.
- Angular 20 idioms: standalone, signals, `inject()`, `input()` / `output()`,
  `computed()`, `effect()` with `onCleanup`.
- Short, descriptive commit messages. Conventional Commits are welcome but not
  enforced.

## Releasing (maintainer notes)

1. Bump `version` in `packages/ngx-rive/package.json`.
2. Move `CHANGELOG.md` entries from `[Unreleased]` to the new version.
3. `npm run build:lib` → inspect `dist/packages/ngx-rive/package.json`.
4. `cd dist/packages/ngx-rive && npm pack --dry-run` to review what will ship.
5. Tag `v<version>` and push. The GitHub Release is manual for now.
