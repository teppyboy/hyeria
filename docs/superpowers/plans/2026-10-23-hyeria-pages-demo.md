# Hyeria GitHub Pages Interactive Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the real Hyeria UI as a GitHub Pages interactive demo backed only by ephemeral in-memory mock API state.

**Architecture:** Add a demo-only `ManagementApiClient`-compatible transport and bootstrap an authenticated in-memory demo session before rendering the shared app. A distinct Vite `demo` mode selects hash routing and prevents production API/session transport from being reachable in the demo bundle. A dedicated Pages workflow builds, scans, uploads, and deploys only the demo artifact.

**Tech Stack:** React 19, TypeScript, Zustand, TanStack Query, Vite+, Vitest, Playwright, GitHub Pages Actions.

**Spec:** `docs/superpowers/specs/2026-10-23-hyeria-pages-demo-design.md`

## Global Constraints

- Preserve v8-only API scope; do not invent undocumented endpoints or response semantics.
- The demo build must never send requests to any API origin or accept visitor-supplied credentials.
- Demo state is memory-only and resets on reload; do not use localStorage, sessionStorage, IndexedDB, or remote persistence.
- Use shared Hyeria pages/components; do not create a parallel showcase application.
- Publish only the dedicated demo output from a separate Pages workflow.
- Keep standard static and single-file management builds and existing CI behavior intact.

## Review Focus

- A visitor navigates directly to a nested/hash route or login route — demo starts in the shared app and never shows a credential form (Task 2 browser test).
- A feature API attempts an unsupported or malformed endpoint/method — mock returns the app’s safe not-supported error without network fallback (Task 1 API tests).
- A visitor tries an action then reloads — supported mutation updates current UI, reload restores baseline fixture, and no storage is touched (Task 1 tests + Task 3 browser tests).
- Vite build/base configuration targets the wrong Pages path — generated artifact resolves JS/CSS under the repository base and hash routes work (Task 3 artifact/browser test).
- The demo bundle or deploy workflow accidentally includes production transport, credentials, or non-demo build outputs — artifact scanner and workflow assertions reject it (Tasks 1 and 3).

---

### Task 1: Add an isolated in-memory demo API transport

**Files:**
- Create: `src/features/demo/api.ts`
- Create: `src/features/demo/fixtures.ts`
- Test: `test/features/demo/demo-api.test.ts`
- Modify: `src/lib/api/client.ts`
- Modify: feature API client parameter types in `src/features/**/api.ts` only as needed to accept the transport interface.

**Interfaces:**
- Produce `ManagementApiTransport` in `src/lib/api/client.ts` with the existing consumed methods: `get<T>(path, options?)`, `post<T>(path, body?, options?)`, `put<T>(path, body?, options?)`, `patch<T>(path, body?, options?)`, `delete<T>(path, options?)`, `getText(path, options?)`, `getBlob(path, options?)`, and `postForm<T>(path, form, options?)`; each mirrors the corresponding `ManagementApiClient` method signature and return type.
- Produce `createDemoApi(): ManagementApiTransport`; each call creates fresh in-memory state from fixture constants. No method invokes `fetch` or browser storage.

- [ ] **Step 1: Write failing tests** for schema-valid demo responses across dashboard/system/auth-files/config/logs/quota/plugins/analytics, representative simulated mutations, state reset between factory instances, unsupported route rejection, and no `fetch`/storage usage.
- [ ] **Step 2: Run** `vp test -- test/features/demo/demo-api.test.ts`; confirm failures for missing transport/factory.
- [ ] **Step 3: Add** `ManagementApiTransport`, update API adapters’ parameter types to it, and implement `createDemoApi` with safe fixtures and only currently implemented UI endpoint behaviors. Unsupported routes reject with `ApiError` (not network fallback). No OAuth codes, user data, usable credential strings, or backend addresses in fixtures.
- [ ] **Step 4: Run** `vp test -- test/features/demo/demo-api.test.ts` and `vp check`; expect focused tests pass and no new diagnostics.
- [ ] **Step 5: Commit** `feat(demo): add isolated in-memory v8 API`.

### Task 2: Bootstrap demo mode in the existing app

**Files:**
- Create: `src/app/entry/demo.tsx`
- Create: `src/features/demo/DemoBanner.tsx`
- Modify: `src/app/entry/build-config.ts`
- Modify: `src/app/entry/render-app.tsx`
- Modify: `src/stores/session.ts`
- Modify: `src/features/auth/queries.ts`
- Modify: `src/routes/login.tsx`
- Modify: `src/components/shell/AppShell.tsx`
- Test: `test/features/demo/demo-entry.test.tsx`

**Interfaces:**
- `renderApp(routerMode: RouterMode, options?: { demoApi?: ManagementApiTransport })` keeps current entry calls valid; demo entry passes a freshly-created `createDemoApi()` instance.
- Add a demo-only session factory/initializer in `src/stores/session.ts` that marks the session authenticated without calling normal `connect`, `normalizeApiBase`, remembered-session storage, or production client creation. `getClient()` returns the provided demo transport through the common interface.
- `DemoBanner` states that this is an interactive demo, actions are simulated, and changes reset on reload; it is visible on every protected route.

- [ ] **Step 1: Write failing tests** that load demo entry, render the real dashboard without login, verify login route cannot show address/key controls, and assert session storage/localStorage are not accessed.
- [ ] **Step 2: Run** `vp test -- test/features/demo/demo-entry.test.tsx`; confirm expected missing demo behavior.
- [ ] **Step 3: Implement** demo session injection and demo banner. Normal app entry must continue using normal session behavior. If `/login` is reached in demo mode, show demo-specific copy/navigation without credential inputs.
- [ ] **Step 4: Run** focused demo-entry tests plus existing `test/features/auth/session.test.ts`, `test/app/router-mode.test.ts`, and `vp check`.
- [ ] **Step 5: Commit** `feat(demo): bootstrap shared UI without login`.

### Task 3: Build, verify, and publish the demo on GitHub Pages

**Files:**
- Modify: `vite.config.ts`
- Create: `vite.config.demo.ts`
- Modify: `package.json`
- Create: `scripts/check-demo-artifact.mjs`
- Create: `.github/workflows/pages-demo.yml`
- Modify: `README.md`
- Test: `test/features/demo/demo-build.test.ts`
- Test: `e2e/specs/demo.spec.ts`
- Modify: `playwright.config.ts`

**Interfaces:**
- Add `build:demo` script: `vp build --mode demo --outDir dist-demo` with Vite base supplied by `DEMO_BASE` (default `/` for local preview).
- `scripts/check-demo-artifact.mjs <directory>` validates one demo `index.html` artifact and rejects known credential sentinels, real management base/client configuration, and references to output directories other than the demo artifact.
- Pages workflow uses repository name for `DEMO_BASE=/${GITHUB_REPOSITORY#*/}/`; uploads only `dist-demo/` and deploys with `pages: write`, `id-token: write`, and the `github-pages` environment.

- [ ] **Step 1: Write failing checks** in `test/features/demo/demo-build.test.ts` for demo-mode selection and the artifact scanner rejecting a credential sentinel or production management endpoint. Add `e2e/specs/demo.spec.ts` for the browser journey: dashboard renders at a project-style base, a simulated config/log/auth-file action changes state, reload resets baseline, and browser network monitoring observes no external API requests.
- [ ] **Step 2: Run** `vp test -- test/features/demo/demo-build.test.ts` and `pnpm exec playwright test --project=demo`; verify expected failures before adding build/workflow.
- [ ] **Step 3: Add** dedicated demo Vite config/entry selection, the `build:demo` script, and artifact scanner. Keep static and management modes unchanged.
- [ ] **Step 4: Add** `.github/workflows/pages-demo.yml`; run on push and manual dispatch, with the deploy job gated to the repository default branch unless manually dispatched. Install via existing vp setup, build with repository project base, run demo tests/scanner, upload only `dist-demo`, then deploy with official Pages artifact/deploy actions and least permissions.
- [ ] **Step 5: Document** the Pages project URL pattern, demo-only behavior, simulated actions, and reload reset in README.
- [ ] **Step 6: Verify** `vp check`, `vp test`, `vp build`, `vp run build:management`, `DEMO_BASE=/hyeria/ vp run build:demo`, demo artifact scan, `pnpm exec playwright test --project=demo`, existing smoke/sensitive/license gates, and `git diff --check`.
- [ ] **Step 7: Commit** `ci: publish interactive demo to GitHub Pages`.

## Spec coverage self-review

- Real UI and shared components: Task 2.
- Dedicated demo build and hash routing: Tasks 2–3.
- In-memory mock with synthetic fixtures and simulated actions: Task 1.
- Reload reset and no browser persistence: Tasks 1–2 and Task 3 Playwright test.
- No external networking or visitor credentials: Tasks 1–2 safety tests and Task 3 artifact scan/browser checks.
- Accessible persistent demo banner and login-route handling: Task 2.
- Separate Pages workflow, least permissions, only demo output, repo path base: Task 3.
- README documentation: Task 3.
- Standard builds/CI preserved: Task 3 verification.

The existing `ManagementApiClient` has a private config field and is not structurally mockable. Task 1 resolves this with a small method interface consumed by existing feature API functions; the production client remains the implementation and behavior is unchanged. No speculative backend semantics are introduced: mock endpoint behavior is limited to endpoints already used by visible features and existing response schemas.
