# Hyeria Management Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Hyeria, an AGPLv3 React management client with official CLI Proxy API v8 feature parity, a Vercel-inspired interface, immediate Vite+ adoption, and both backend-hosted `management.html` and normal static builds.

**Architecture:** Keep Hyeria as a browser-side management client for CLI Proxy API v8. Use React Router with shared route definitions, TanStack Query for server state, Zustand/local state for preferences and transient UI, and feature-owned API/query/form modules. Build the same application twice: hash-routed, single-file `management.html` for official backend hosting, and a normal static build with optional history routing.

**Tech Stack:** React, TypeScript, Vite+, shadcn/ui, Tailwind CSS, React Router, TanStack Query, Zustand, React Hook Form, Zod, CodeMirror 6, i18next/react-i18next, Vitest, Testing Library, Playwright (or the selected Vite+ browser runner), and a Vite+ compatible single-file output strategy.

**Spec:** `docs/superpowers/specs/2026-10-21-hyeria-management-center-design.md`

## Global Constraints

- Target CLI Proxy API **v8 only** through `/v8/management`; do not add new `/v0/management` functionality.
- The primary release is a self-contained `management.html` artifact served by the CLI Proxy API host.
- The secondary release is a normal Vite static build under `dist/`; it must not be required for official compatibility.
- Use hash routing for the official single-file build; use optional browser-history routing only for the normal static build.
- Adopt Vite+ immediately; validate the exact selected Vite+ release and plugin compatibility before feature work.
- Use shadcn/ui as locally owned source components with semantic design tokens; do not add an opaque hosted UI runtime.
- Keep browser credentials memory-only by default; remembered sessions are opt-in and must be labeled as reversible browser persistence, not encryption.
- Never put management keys in URLs, route state, document titles, telemetry, logs, error reports, or diagnostic bundles.
- Backend validation, authorization, persistence, OAuth, quotas, credential handling, and plugin lifecycle remain authoritative.
- Plugins are included, but arbitrary plugin JavaScript must not execute in the Hyeria page context.
- Analytics must label live/session-derived data accurately and must not imply durable history without a collector/database.
- Product name is **Hyeria** and the project license is **GNU AGPLv3**; the final logo is deferred.
- Every feature slice must include loading, empty, error, unsupported-capability, responsive, keyboard, and screen-reader states where applicable.
- Do not commit secrets, live credentials, unsanitized backend fixtures, or provider credentials.

## Review Focus

- **Build-mode divergence:** official hash-routed `management.html` and normal static output must share behavior without relying on host rewrites — test both artifacts and route adapters in Tasks 1–2.
- **Connection switching races:** responses from an old API instance must never overwrite the active instance — test connection revision cancellation in Task 3.
- **v8 body/error semantics:** raw config node values, YAML writes, 401/403/404/409/422/502/503 errors, and OAuth callback exceptions must remain distinct — test transport and contract fixtures in Tasks 3 and 6.
- **Credential and plugin leakage:** keys/tokens must not appear in persistence, URLs, logs, error surfaces, or arbitrary plugin DOM/script execution — test redaction and constrained rendering in Tasks 3 and 10.
- **Ephemeral analytics truthfulness:** queue/bucket data must show freshness and session scope rather than fabricated history — test view-model labels and empty/stale states in Task 11.

## File map

The new project should use this ownership model:

```text
package.json, vite.config.ts, vite.config.management.ts, vite.config.static.ts
vite.config.ts, vp.config.ts, tsconfig*.json, components.json
vercel.json (not required), .github/workflows/ci.yml
src/
  app/entry/{main.tsx,management.tsx}
  app/{providers.tsx,router.tsx,query-client.ts}
  components/ui/                         # shadcn source components
  components/shell/{app-shell,sidebar,header}.tsx
  components/feedback/{notifications,error-boundary}.tsx
  features/<feature>/{api,queries,schemas,components,routes}.ts(x)
  lib/{api,connection,errors,feature-support,security,i18n}.ts
  stores/{preferences,ui}.ts
  styles/{globals.css,tokens.css}
  types/management-api.ts
  test/{setup,fixtures,helpers}
  e2e/{auth,core,builds}.spec.ts
public/                                  # only non-sensitive static assets
LICENSE, NOTICE, README.md
```

The plan uses feature directories rather than one global API/store dump. Exact files can be split further when a feature’s implementation is large, but ownership must remain local to the feature.

---

### Task 1: Scaffold the Vite+ project and legal foundation

**Files:**
- Create: `package.json`, `vp.config.ts`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- Create: `index.html`, `src/app/entry/main.tsx`, `src/app/entry/management.tsx`
- Create: `src/styles/globals.css`, `src/styles/tokens.css`
- Create: `LICENSE`, `NOTICE`, `README.md`
- Create: `.github/workflows/ci.yml`
- Test: `test/toolchain/project-smoke.test.ts`

**Interfaces:**
- Produces `vp dev`, `vp check`, `vp test`, and `vp build` commands.
- Produces separate application entry points for normal static and management builds.
- Establishes AGPLv3 attribution/legal-notice placeholders without adding the final logo.

- [ ] **Step 1: Scaffold with the selected Vite+ release**

Use the Vite+ create flow for a React TypeScript application. Record the exact Vite+ version, Node runtime, and package manager in `package.json`/README. Do not install a legacy Vite+ binary from an unrelated global installation.

- [ ] **Step 2: Configure the baseline scripts and checks**

Define scripts/tasks for `dev`, `check`, `test`, `build`, `build:management`, and `preview`, while keeping `vp dev`, `vp check`, `vp test`, and `vp build` available as built-ins.

- [ ] **Step 3: Add AGPLv3 and project notices**

Add the full AGPLv3 license, a `NOTICE` file for project attribution and third-party notices, and a README section explaining Hyeria’s independent relationship to CLI Proxy API and its source/build process.

- [ ] **Step 4: Write the toolchain smoke test**

Assert that the test environment loads, the app entry module can be imported, and the build-mode configuration exposes only `hash` or `history` as valid router modes.

- [ ] **Step 5: Validate the foundation**

Run:

```bash
vp install
vp check
vp test
vp build
```

Expected: all commands pass and the normal static build produces `dist/index.html` without secrets.

- [ ] **Step 6: Commit**

```bash
git add package.json vp.config.ts vite.config.ts tsconfig*.json index.html src LICENSE NOTICE README.md .github/workflows/ci.yml test
git commit -m "build: scaffold Hyeria with Vite+"
```

### Task 2: Add shadcn/ui tokens and dual-build routing

**Files:**
- Create: `components.json`
- Create/modify: `src/components/ui/*`, `src/styles/tokens.css`, `src/styles/globals.css`
- Create: `src/app/router.tsx`, `src/app/entry/router-mode.ts`
- Create: `vite.config.management.ts`, `vite.config.static.ts`
- Modify: `package.json`, `vite.config.ts`
- Test: `test/app/router-mode.test.ts`, `test/build/build-artifacts.test.ts`

**Interfaces:**
- `getRouterMode(): 'hash' | 'history'` reads the build mode without exposing secrets.
- `createAppRouter(mode: RouterMode)` returns the shared route-capable router.
- Produces `dist-management/management.html` for the official build and `dist/index.html` for the normal build.

- [ ] **Step 1: Add shadcn/ui using the Vite setup**

Initialize Tailwind, the `@/*` alias, `components.json`, and only the primitives needed by the shell and first vertical slice: button, card, input, label, alert, badge, separator, skeleton, sheet, sidebar, dialog, dropdown-menu, tooltip, and sonner/toast equivalent.

- [ ] **Step 2: Define semantic Hyeria tokens**

Implement neutral light, white, dark, and system themes using CSS variables for surfaces, text, muted text, borders, focus, destructive/success/warning/info states, sidebar, chart colors, radius, typography, spacing, and reduced motion.

- [ ] **Step 3: Implement shared route mode selection**

Use hash routing for the management entry and history routing for the normal static entry. Keep route declarations in one module; only router construction changes.

- [ ] **Step 4: Configure the single-file management build**

Use a Vite+ compatible single-file plugin or output hook to inline JavaScript and CSS, disable code splitting for this target, emit `dist-management/management.html`, and avoid external runtime assets. If the plugin fails under the selected Vite+ release, replace it with a narrow output hook rather than weakening the artifact requirement.

- [ ] **Step 5: Add artifact tests**

Build both modes in CI and assert that the management artifact exists, contains no external application script/module dependency, and includes the app marker; assert that the normal build has the expected static entry and assets.

- [ ] **Step 6: Validate and commit**

Run:

```bash
vp check
vp test
vp build
vp run build:management
```

Expected: both output directories exist, the management file is self-contained, and router-mode tests pass.

```bash
git add components.json src/components/ui src/styles src/app/router.tsx src/app/entry/router-mode.ts vite.config.* package.json test/build test/app
git commit -m "build: add shadcn design system and dual outputs"
```

### Task 3: Implement connection transport, session state, and v8 error handling

**Files:**
- Create: `src/lib/connection/normalize-api-base.ts`
- Create: `src/lib/api/client.ts`, `src/lib/api/errors.ts`, `src/lib/api/headers.ts`
- Create: `src/stores/session.ts`
- Create: `src/app/providers.tsx`, `src/app/query-client.ts`
- Create: `src/features/auth/api.ts`, `src/features/auth/schemas.ts`, `src/features/auth/queries.ts`
- Test: `test/lib/connection/*.test.ts`, `test/lib/api/*.test.ts`, `test/features/auth/session.test.ts`

**Interfaces:**
- `normalizeApiBase(input: string, location?: Location): string` returns a base origin/path without a duplicated management suffix.
- `ManagementApiClient` supports `get`, `post`, `put`, `patch`, `delete`, `getText`, `getBlob`, and `postForm`, all accepting an optional `AbortSignal`.
- `ApiError` contains safe `status`, `code`, `apiCode`, `message`, and redacted `details` fields.
- `useSessionStore` exposes `connect`, `disconnect`, `clearPersistedConnection`, `isAuthenticated`, `apiBase`, `managementKey`, `connectionRevision`, and capability metadata.
- `QueryClient` is scoped/cleared on disconnect and instance changes.

- [ ] **Step 1: Write URL, header, and error tests**

Cover host-only inputs, scheme-qualified inputs, `/v8/management` inputs, trailing slashes, malformed URLs, case-insensitive headers, missing status, JSON errors, text errors, and v8 statuses 400/401/403/404/409/422/502/503.

- [ ] **Step 2: Implement URL normalization and safe error parsing**

Normalize only the management base; never persist or echo the management key. Preserve backend status/code/message distinctions and redact known credential-shaped values in safe error details.

- [ ] **Step 3: Write session tests**

Cover successful config-probe login, failed login, logout cleanup, 401-triggered cleanup, memory-only default, explicit remembered-session warning state, and connection switching while a request is in flight.

- [ ] **Step 4: Implement the API client**

Inject `Authorization: Bearer` only for active sessions, parse version/build/plugin headers, support JSON/YAML/multipart/binary operations, reject stale response side effects after a connection revision changes, and dispatch unauthorized handling without logging request bodies.

- [ ] **Step 5: Implement session and query providers**

Keep the management key in memory by default. If persistence is enabled, store only the explicit compatibility fields through a clearly named storage adapter and make the UI warning mandatory. Clear query caches and feature state on disconnect.

- [ ] **Step 6: Validate and commit**

Run the focused test suites, then `vp check` and `vp test`.

```bash
git add src/lib/api src/lib/connection src/stores/session.ts src/app/providers.tsx src/app/query-client.ts src/features/auth test/lib test/features/auth
git commit -m "feat: add v8 connection and session transport"
```

### Task 4: Build the application shell, legal notices, theme, language, and feedback system

**Files:**
- Create: `src/components/shell/AppShell.tsx`, `Sidebar.tsx`, `Header.tsx`, `MobileNav.tsx`
- Create: `src/components/feedback/NotificationProvider.tsx`, `ErrorBoundary.tsx`, `ConfirmDialog.tsx`
- Create: `src/stores/preferences.ts`, `src/stores/ui.ts`
- Create: `src/lib/i18n.ts`, `src/locales/en.json`, `zh-CN.json`, `zh-TW.json`, `ru.json`
- Create: `src/routes/login.tsx`, `src/routes/protected-layout.tsx`
- Modify: `src/app/router.tsx`, `src/app/entry/*.tsx`
- Test: `test/components/shell/*.test.tsx`, `test/lib/i18n.test.ts`, `test/components/feedback/*.test.tsx`

**Interfaces:**
- `AppShell` renders responsive navigation, header actions, content outlet, and legal notice access.
- `ProtectedLayout` redirects unauthenticated users to `/login` and preserves a safe return route.
- `usePreferencesStore` manages language/theme only; `useUiStore` manages sidebar, dialogs, and notifications.

- [ ] **Step 1: Write shell accessibility and route tests**

Assert that unauthenticated users see login, authenticated users see navigation landmarks, keyboard users can collapse/open the sidebar and mobile sheet, and route changes do not expose the management key.

- [ ] **Step 2: Implement the protected layout and shell**

Create the responsive sidebar groups: Operate, Gateway, Observe, Control, Analytics, and dynamic Plugin Pages. Use shadcn primitives and semantic tokens; avoid recreating the reference’s monolithic layout component.

- [ ] **Step 3: Implement theme/language preferences**

Support system/automatic, light, white, and dark themes plus the four initial languages. Detect browser language, allow manual override, set `document.documentElement.lang`, and persist only non-sensitive preferences.

- [ ] **Step 4: Implement notifications, confirmations, and error boundaries**

Provide accessible success/error notifications, destructive-action confirmation, route-level fallback states, and safe backend error display.

- [ ] **Step 5: Add AGPL legal-notice UI**

Expose a convenient legal/about entry showing copyright, no-warranty notice, AGPLv3, source location/build instructions, and independent-project attribution.

- [ ] **Step 6: Validate and commit**

Run focused component tests, keyboard checks, `vp check`, and `vp test`.

```bash
git add src/components/shell src/components/feedback src/stores/preferences.ts src/stores/ui.ts src/lib/i18n.ts src/locales src/routes src/app test/components test/lib/i18n.test.ts
git commit -m "feat: add Hyeria application shell"
```

### Task 5: Implement dashboard, system, models, and capability discovery

**Files:**
- Create: `src/features/dashboard/api.ts`, `queries.ts`, `schemas.ts`, `routes/DashboardPage.tsx`
- Create: `src/features/system/api.ts`, `queries.ts`, `routes/SystemPage.tsx`
- Create: `src/features/models/api.ts`, `queries.ts`, `schemas.ts`
- Create: `src/lib/feature-support/capabilities.ts`
- Test: `test/features/dashboard/*.test.tsx`, `test/features/system/*.test.ts`, `test/lib/feature-support.test.ts`

**Interfaces:**
- `CapabilitySnapshot` includes server version/build, plugin support, available model channels, and endpoint availability.
- `useDashboardQuery()` returns normalized status/model summaries.
- `useSystemQueries()` covers latest version, model definitions, and safe local-session cleanup.

- [ ] **Step 1: Add fixtures and tests for dashboard/system states**

Cover complete data, partial endpoint failure, unavailable models, unsupported plugin capability, loading, empty, stale, and unauthorized states.

- [ ] **Step 2: Implement capability normalization**

Combine response headers and endpoint results into a capability snapshot without assuming that an endpoint exists merely because the UI route exists.

- [ ] **Step 3: Implement dashboard and system queries/pages**

Use cards, badges, progress indicators, and clear status text. Model availability must reflect the backend and must not expose upstream keys.

- [ ] **Step 4: Validate and commit**

Run focused tests plus `vp check` and `vp test`.

```bash
git add src/features/dashboard src/features/system src/features/models src/lib/feature-support test/features/dashboard test/features/system test/lib/feature-support.test.ts
git commit -m "feat: add dashboard system and capabilities"
```

### Task 6: Implement configuration management and the YAML diff editor

**Files:**
- Create: `src/features/config/api.ts`, `queries.ts`, `schemas.ts`, `config-paths.ts`
- Create: `src/features/config/components/VisualConfigForm.tsx`, `YamlEditor.tsx`, `ConfigDiffDialog.tsx`
- Create: `src/features/config/routes/ConfigPage.tsx`
- Create: `src/lib/config/yaml.ts`, `src/lib/config/diff.ts`
- Test: `test/features/config/*.test.ts`, `test/lib/config/*.test.ts`

**Interfaces:**
- `readConfig(): Promise<ConfigDocument>`.
- `readConfigYaml(): Promise<string>`.
- `writeConfig(document: ConfigDocument): Promise<MutationResult>`.
- `writeConfigYaml(yaml: string): Promise<MutationResult>`.
- `patchConfigPath(path: string[], value: unknown): Promise<MutationResult>`.
- `deleteConfigPath(path: string[]): Promise<MutationResult>`.
- `parseAndValidateYaml(text: string): ParseResult`.
- `buildConfigDiff(before: string, after: string): ConfigDiff`.

- [ ] **Step 1: Write v8 contract tests**

Assert that full config writes send the raw object, node writes send the raw JSON value, YAML writes use `application/yaml`, deletes use `DELETE`, and legacy `{ value: ... }` envelopes are never sent.

- [ ] **Step 2: Write YAML/diff tests**

Cover malformed YAML, valid YAML with invalid config shape, comments/formatting preservation where supported, changed/added/deleted nodes, empty documents, and sensitive-value redaction in rendered diffs.

- [ ] **Step 3: Implement config API and utilities**

Keep v8 path semantics explicit; lists are replaced as whole values and path segments are mapping keys, not array indexes. Delegate final validation and migration behavior to the backend.

- [ ] **Step 4: Implement CodeMirror editor and visual forms**

Use focused common settings for visual editing and raw YAML for advanced fields. Require a diff confirmation for broad writes and show 400/422/read-only/write failures without dumping secret values.

- [ ] **Step 5: Validate and commit**

Run focused tests, then full `vp check` and `vp test`.

```bash
git add src/features/config src/lib/config test/features/config test/lib/config
git commit -m "feat: add v8 configuration editor"
```

### Task 7: Implement providers, client keys, models, aliases, and excluded-model rules

**Files:**
- Create: `src/features/providers/api.ts`, `queries.ts`, `schemas.ts`, `routes/ProvidersPage.tsx`
- Create: `src/features/providers/components/ProviderForm.tsx`, `ProviderTable.tsx`, `HeadersEditor.tsx`
- Create: `src/features/models/components/ModelAliasEditor.tsx`, `ExcludedModelsEditor.tsx`
- Test: `test/features/providers/*.test.ts`, `test/features/models/*.test.ts`

**Interfaces:**
- Provider adapters normalize v8 provider groups into typed view models and serialize them back without losing unknown backend-supported fields.
- Mutations expose add/update/delete/replace operations with explicit query invalidation.
- Alias/exclusion utilities expose deterministic validation and normalization functions.

- [ ] **Step 1: Write provider contract fixtures/tests**

Cover Gemini, Codex, Claude, Vertex, OpenAI-compatible groups, custom headers, proxy URLs, empty keys, excluded models, aliases, duplicate entries, and backend validation failures.

- [ ] **Step 2: Implement provider adapters and schemas**

Use provider-specific schemas over one giant permissive form. Preserve backend field names at the API boundary and use typed view models in the UI.

- [ ] **Step 3: Implement provider workbench and key management**

Add responsive tables/cards, masked secret fields, reveal controls that never persist or log values, destructive confirmations, and clear mutation status.

- [ ] **Step 4: Implement model alias/exclusion editing**

Validate duplicates, whitespace, empty entries, and provider-specific constraints; show the backend’s normalized result after save.

- [ ] **Step 5: Validate and commit**

Run focused tests and `vp check`/`vp test`.

```bash
git add src/features/providers src/features/models test/features/providers test/features/models
git commit -m "feat: add provider and model management"
```

### Task 8: Implement auth files and OAuth/device flows

**Files:**
- Create: `src/features/auth-files/api.ts`, `queries.ts`, `schemas.ts`, `routes/AuthFilesPage.tsx`
- Create: `src/features/auth-files/components/AuthFileTable.tsx`, `UploadDialog.tsx`, `AuthFileDetails.tsx`
- Create: `src/features/oauth/api.ts`, `queries.ts`, `state-machine.ts`, `routes/OAuthPage.tsx`
- Test: `test/features/auth-files/*.test.ts`, `test/features/oauth/*.test.ts`

**Interfaces:**
- Auth-file API covers list/upload/download/delete/status/fields/refresh/models.
- OAuth state machine states are `idle | starting | awaiting-user | polling | success | error | cancelled` and retain only safe provider/state metadata.
- OAuth operations support start, poll, cancel, callback completion, and Vertex import.

- [ ] **Step 1: Write credential and OAuth tests**

Cover multipart field names, runtime-only records, safe filename validation, disabled state, refresh errors, device-code expiry, pending polling, cancellation, callback errors, provider-not-found, and success refresh.

- [ ] **Step 2: Implement auth-file API/query layer**

Treat `auth_index`/file identity as backend data; do not infer or expose credential contents in list rows. Use blob downloads with safe filenames.

- [ ] **Step 3: Implement auth-file UI**

Add upload/delete/download/status/refresh actions, provider filters, empty states, and confirmation for destructive operations.

- [ ] **Step 4: Implement OAuth state machine and UI**

Open returned URLs safely, support device code display, poll with cancellation/timeout, handle the callback exception defined by v8, and invalidate credentials after success.

- [ ] **Step 5: Validate and commit**

Run focused tests, then `vp check` and `vp test`.

```bash
git add src/features/auth-files src/features/oauth test/features/auth-files test/features/oauth
git commit -m "feat: add credentials and OAuth flows"
```

### Task 9: Implement quotas, cooldown/reset actions, and logs

**Files:**
- Create: `src/features/quota/api.ts`, `queries.ts`, `schemas.ts`, `routes/QuotaPage.tsx`
- Create: `src/features/logs/api.ts`, `queries.ts`, `schemas.ts`, `routes/LogsPage.tsx`
- Create: `src/features/logs/components/LogViewer.tsx`, `LogFilters.tsx`, `ErrorLogDownloads.tsx`
- Test: `test/features/quota/*.test.ts`, `test/features/logs/*.test.ts`

**Interfaces:**
- Quota adapters normalize provider-specific quota responses while retaining provider-specific detail.
- Log queries support cursor/`after` incremental fetching, cancellation, filter state, clear, error-file list, and safe download.

- [ ] **Step 1: Write quota/log contract tests**

Cover provider success, provider 404/502, stale quota, cooldown reset, log-disabled 400, empty logs, cursor reset, incremental batches, clear responses, safe error-log filename handling, and download failures.

- [ ] **Step 2: Implement quota adapters and UI**

Show independent loading/error states per provider, reset cooldown only with confirmation, and label stale data.

- [ ] **Step 3: Implement log transport and viewer**

Use cursor/after semantics from v8, pause/cancel polling on unmount, virtualize or window large line sets, and redact obvious credential-shaped content before display/export.

- [ ] **Step 4: Add filters/downloads/clear actions**

Support search, management-traffic visibility, request-error files, safe download, and destructive clear confirmation.

- [ ] **Step 5: Validate and commit**

Run focused tests and full checks.

```bash
git add src/features/quota src/features/logs test/features/quota test/features/logs
git commit -m "feat: add quota and log operations"
```

### Task 10: Implement plugin discovery, store, configuration, and resources

**Files:**
- Create: `src/features/plugins/api.ts`, `queries.ts`, `schemas.ts`, `capabilities.ts`
- Create: `src/features/plugins/routes/PluginsPage.tsx`, `PluginStorePage.tsx`, `PluginResourcePage.tsx`
- Create: `src/features/plugins/components/PluginCard.tsx`, `PluginResourceRenderer.tsx`, `RestartRequiredAlert.tsx`
- Modify: `src/components/shell/Sidebar.tsx`, `src/app/router.tsx`
- Test: `test/features/plugins/*.test.ts`, `test/components/shell/plugin-navigation.test.tsx`

**Interfaces:**
- `PluginCapabilitySnapshot` controls plugin routes/navigation.
- Plugin resource metadata is validated before navigation/rendering.
- `PluginResourceRenderer` supports only explicitly recognized safe resource types and returns an unsupported state for the rest.

- [ ] **Step 1: Write plugin security and behavior tests**

Cover no-plugin backends, plugin metadata changes, duplicate IDs, install/update/remove/restart-required responses, quota errors, malformed resource metadata, HTML/script payloads, and unsupported resource types.

- [ ] **Step 2: Implement plugin API/query/capability layer**

Use v8 plugin endpoints and config paths; keep executable artifact installation visibly privileged and backend-authoritative.

- [ ] **Step 3: Implement plugin management/store pages**

Show installed/configured state, source/version/update errors, enablement, uninstall confirmation, and restart-required status.

- [ ] **Step 4: Implement constrained resource navigation/rendering**

Build menus from validated metadata and render only safe, known component/data formats. Never use unsanitized `innerHTML`, dynamic script injection, or arbitrary module loading.

- [ ] **Step 5: Validate and commit**

Run security-focused plugin tests, component tests, `vp check`, and `vp test`.

```bash
git add src/features/plugins src/components/shell/Sidebar.tsx src/app/router.tsx test/features/plugins test/components/shell/plugin-navigation.test.tsx
git commit -m "feat: add plugin management and resources"
```

### Task 11: Implement live/session analytics

**Files:**
- Create: `src/features/analytics/api.ts`, `queries.ts`, `schemas.ts`, `view-models.ts`, `routes/AnalyticsPage.tsx`
- Create: `src/features/analytics/components/MetricCards.tsx`, `UsageTable.tsx`, `FreshnessNotice.tsx`, `AnalyticsCharts.tsx`
- Test: `test/features/analytics/*.test.ts`

**Interfaces:**
- `AnalyticsSource` identifies `usage-queue | api-key-buckets | logs | quotas`.
- `AnalyticsViewModel` includes values, `scope: 'live' | 'session' | 'historical'`, `observedAt`, freshness, coverage notes, and unavailable reasons.
- Analytics pages never label queue-derived data as durable history.

- [ ] **Step 1: Write analytics truthfulness tests**

Assert that usage queue data is labeled live/session-scoped, empty queues show unavailable/empty rather than zero history, stale data shows freshness warnings, and missing endpoints produce an explicit unsupported state.

- [ ] **Step 2: Implement source adapters**

Use available v8 usage queue, API-key buckets, logs, quota snapshots, and model/provider data without adding a database. Normalize provider/model/key dimensions while redacting keys.

- [ ] **Step 3: Implement dashboard tables/cards/charts**

Use charts only for meaningful returned time buckets; otherwise show tables and summaries. Include explanatory coverage/freshness text.

- [ ] **Step 4: Validate and commit**

Run focused analytics tests and full checks.

```bash
git add src/features/analytics test/features/analytics
git commit -m "feat: add session-scoped analytics"
```

### Task 12: Add end-to-end coverage, release artifacts, documentation, and hardening

**Files:**
- Create: `e2e/auth.spec.ts`, `e2e/core.spec.ts`, `e2e/builds.spec.ts`
- Create: `test/fixtures/v8/*.json`, `test/fixtures/v8/*.yaml`
- Modify: `.github/workflows/ci.yml`, `README.md`, `NOTICE`, `package.json`
- Create: `scripts/smoke-management-artifact.ts`, `scripts/check-sensitive-output.ts`

**Interfaces:**
- E2E tests consume a disposable/mocked CLI Proxy API v8 endpoint configured through test environment variables; no live credentials are committed.
- `smoke-management-artifact` exits nonzero if `management.html` is missing, not self-contained, or contains forbidden external app references.
- `check-sensitive-output` fails on known credential markers in build/test artifacts.

- [ ] **Step 1: Add sanitized v8 fixtures and test server helpers**

Include representative config, credentials metadata, OAuth statuses, quota responses, logs/cursors, plugin metadata, errors, and model definitions with fake values only.

- [ ] **Step 2: Write critical E2E flows**

Cover login/protected navigation, dashboard, safe config edit, provider mutation, auth-file lifecycle, OAuth mock flow, quota/log viewing, plugin navigation, logout, and both route modes.

- [ ] **Step 3: Add build/security smoke checks**

Verify both artifacts, route markers, no external application dependencies in `management.html`, no secret-like values in outputs, and AGPL/NOTICE presence.

- [ ] **Step 4: Harden CI**

Run `vp install`, `vp check`, `vp test`, normal build, management build, artifact smoke checks, E2E (where the CI backend fixture is available), and dependency/license checks. Keep failures actionable and do not weaken assertions to make CI pass.

- [ ] **Step 5: Complete documentation**

Document backend requirements, v8-only support, both build commands, backend installation of `management.html`, browser credential risks, plugin trust considerations, analytics scope, development setup, testing, source availability, AGPLv3, and logo integration instructions.

- [ ] **Step 6: Validate the release candidate**

Run:

```bash
vp check
vp test
vp build
vp run build:management
node scripts/smoke-management-artifact.ts
node scripts/check-sensitive-output.ts
```

Expected: all checks pass, both artifacts are reproducible from source, and no secrets or forbidden external runtime dependencies are present.

- [ ] **Step 7: Commit**

```bash
git add e2e test/fixtures scripts .github README.md NOTICE package.json
 git commit -m "test: harden Hyeria release artifacts"
```

## Plan self-review

- **Spec coverage:** Tasks 1–2 cover Vite+, shadcn/ui, tokens, dual builds, routing, legal foundation, and both artifacts. Tasks 3–5 cover connection/session, shell, themes, language, dashboard, system, models, capabilities, and accessibility. Tasks 6–9 cover configuration, YAML/diff, providers, client keys, auth files, OAuth, quotas, and logs. Task 10 covers plugins and constrained resources. Task 11 covers analytics. Task 12 covers E2E, security, AGPL documentation, CI, and release verification.
- **Step granularity:** Each task has a bounded feature seam; every implementation step names its files or interface and has a focused validation step. The plan does not prescribe component bodies where tests and interfaces determine the implementation.
- **Type consistency:** Router mode, API client, `ApiError`, session, capability, OAuth state, and analytics interfaces are introduced before consumers. Feature APIs remain feature-owned and do not depend on later tasks.
- **Review focus coverage:** Build divergence is tested in Tasks 1–2 and 12; connection races in Task 3; v8 semantics in Tasks 3 and 6; credential/plugin leakage in Tasks 3 and 10/12; analytics truthfulness in Task 11.
- **Scope:** The plan implements the approved management client and staged analytics only. BFF, durable collector, multi-user identity, v0 compatibility, arbitrary plugin scripting, and final logo remain deferred as specified.
