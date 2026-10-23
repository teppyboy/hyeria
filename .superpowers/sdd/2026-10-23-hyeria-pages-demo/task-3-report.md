# Task 3 report

## Status

Task 3 build, artifact scanning, Pages workflow, documentation, and focused checks are implemented in `feature/demo-pages`.

## Changes

- Added `vite.config.demo.ts`; `vite.config.ts` selects it only for `demo` mode and uses `DEMO_BASE` (default `/`).
- Added `build:demo` and `check:demo` scripts.
- Added `scripts/check-demo-artifact.mjs`, scanning the complete output for credential sentinels, management configuration/endpoints, and non-demo output references.
- Added `.github/workflows/pages-demo.yml` with repository-name base, build/test/scan steps, demo-only Pages artifact upload, default-branch/manual deploy gate, least deploy permissions, and `github-pages` environment.
- Documented the Pages URL, in-memory simulated behavior, and reload reset in README.
- Added focused artifact/build tests.

## Validation

- `vp test -- test/features/demo/demo-build.test.ts` — passed (3 tests).
- `git diff --check` — passed.
- `vp check` and demo build were not run because this isolated baseline does not contain Task 1/Task 2 demo runtime interfaces or `src/app/entry/demo.tsx` yet.

## Integration adjustment

After Task 2 is integrated, the demo Vite entry replacement will resolve `src/app/entry/demo.tsx`. The Playwright `demo` project and demo preview server should be added/enabled at integration time, alongside the Task 2 runtime entry; this branch intentionally does not add a nonfunctional project against the absent entry.

The primary worktree contains an earlier partial Task 3 diff from the timed-out run; it was not modified or reset.
