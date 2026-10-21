# CLI Proxy API Management Center Reimplementation Research

> Read-only research and implementation plan for reimplementing [`router-for-me/Cli-Proxy-API-Management-Center`](https://github.com/router-for-me/Cli-Proxy-API-Management-Center) with React, shadcn/ui, Vercel-style conventions, Vite, and Vite+.
>
> Research date: 2026-10-21

## Executive recommendation

Build a **client-first React/Vite management console** with:

- **shadcn/ui + Tailwind semantic tokens** for the visual system and accessible primitives.
- **React Router** for nested layouts, protected routes, and feature-level route ownership.
- **TanStack Query** for backend-owned server state, cache invalidation, polling, and mutations.
- **React Hook Form + Zod** for typed forms and client-side feedback; keep authorization and validation authoritative on the backend.
- **CodeMirror 6** for YAML/config editing and diff review.
- **Zustand only for session/UI preferences**, not as the primary server-cache layer.
- **Vite+** adopted immediately as the unified toolchain. It is a toolchain, not a replacement for the API/backend.
- **Backend-hosted deployment as the primary target**, preserving `management.html` compatibility. Also produce a normal static build for optional hosting elsewhere; Vercel hosting and Vercel-specific rewrites are not product requirements.

The most important decision is **not the UI library**. It is whether this remains a browser-to-CLIProxyAPI client, or becomes a new hosted control plane with its own backend, identity, persistence, and proxy/network privileges. The recommended first release preserves the existing product boundary: the UI manages an existing CLI Proxy API instance and does not forward traffic.

## Research scope and evidence

Research was split into independent lanes:

1. **Reference repository:** README, repository tree, package manifest, app shell, routes, layout, API client, auth store, protected routing, storage, Vite config, CI, and release workflow.
2. **Target stack:** official shadcn/ui, Vite, Vercel, Vite+, React Router, React, TanStack Query, and Vitest documentation.
3. **Migration architecture:** API contracts, browser credential handling, SSRF/CORS/CSRF, deployment, observability, and test strategy using OpenAPI and OWASP/Vercel guidance.

Primary evidence is linked throughout. Facts directly observed in source are marked as observed; recommendations and inferred risks are labeled accordingly.

## 1. What the reference product is

### Product boundary

The reference is a **management UI for CLI Proxy API**, not the proxy itself. It connects to an already-running CLI Proxy API service, uses its v8 Management API, and is normally bundled into a single `management.html` file hosted by that backend.

The README explicitly states:

- Requires CLI Proxy API >= 8.0.0.
- Uses `/v8/management` and the v8 configuration layout.
- Does not forward traffic.
- The management key is distinct from client API keys.
- Remote access may require backend configuration.

Sources:

- [Reference README](https://github.com/router-for-me/Cli-Proxy-API-Management-Center/blob/main/README.md)
- [CLIProxyAPI README](https://github.com/router-for-me/CLIProxyAPI/blob/main/README.md)

### User journey

1. Start the CLI Proxy API service.
2. Open `management.html` or the deployed SPA.
3. Enter the API address and management key.
4. The UI tests the connection by fetching configuration.
5. On success, the user enters a protected management shell.
6. The user manages configuration, providers, credentials, OAuth, quotas, logs, plugins, and system information.
7. A 401 response logs the user out.

Observed source:

- [`src/App.tsx`](https://github.com/router-for-me/Cli-Proxy-API-Management-Center/blob/main/src/App.tsx) uses `createHashRouter`, with `/login` outside the protected shell.
- [`src/router/ProtectedRoute.tsx`](https://github.com/router-for-me/Cli-Proxy-API-Management-Center/blob/main/src/router/ProtectedRoute.tsx) restores/checks authentication and redirects unauthenticated users.
- [`src/stores/useAuthStore.ts`](https://github.com/router-for-me/Cli-Proxy-API-Management-Center/blob/main/src/stores/useAuthStore.ts) configures the API client, probes configuration, tracks connection status, and clears caches on logout.
- [`src/services/api/client.ts`](https://github.com/router-for-me/Cli-Proxy-API-Management-Center/blob/main/src/services/api/client.ts) adds `Authorization: Bearer <management key>`, reads server version/support headers, and emits unauthorized events.

### Information architecture

The route inventory is:

| Area | Routes / behavior | Priority |
|---|---|---:|
| Login | `/login` | P0 |
| Dashboard | `/`, `/dashboard` | P0 |
| Quick start | `/quick-start` | P1 |
| AI providers | `/ai-providers` | P0 |
| Auth files | `/auth-files` | P0 |
| Auth-file OAuth exclusions | `/auth-files/oauth-excluded` | P1 |
| Auth-file model aliases | `/auth-files/oauth-model-alias` | P1 |
| OAuth | `/oauth` | P0 |
| Quotas | `/quota` | P0 |
| Logs | `/logs` | P0 |
| Config | `/config`; `/settings` and `/api-keys` redirect here | P0 |
| Plugins | `/plugins`, `/plugin-store` | P1 / conditional |
| Plugin resources | `/plugin-pages/:pluginId/:menuIndex` | P1 / conditional |
| System | `/system` | P1 |
| Unknown / unsupported | redirect to `/` | P1 |

The main layout groups navigation into operate, gateway, observe, control, and plugin-page sections. Plugin resources and plugin routes are advertised only when backend response headers indicate support. Auth file count is shown as a sidebar badge.

Observed source:

- [`src/router/MainRoutes.tsx`](https://github.com/router-for-me/Cli-Proxy-API-Management-Center/blob/main/src/router/MainRoutes.tsx)
- [`src/components/layout/MainLayout.tsx`](https://github.com/router-for-me/Cli-Proxy-API-Management-Center/blob/main/src/components/layout/MainLayout.tsx)
- [`src/features/`](https://github.com/router-for-me/Cli-Proxy-API-Management-Center/tree/main/src/features)

### Backend/API surface

The API service barrel exposes modules for:

- Generic API calls and error parsing.
- Configuration and config-file access.
- Client API keys and usage.
- Provider configuration and provider models.
- Auth files and cooldown/policy handling.
- OAuth flows.
- Logs.
- Models and model aliases.
- Provider quotas, including Claude, Kimi, Meta, Devin, Antigravity, and related integrations.
- Plugins and plugin resources.
- Version and Vertex-related operations.

Sources:

- [`src/services/api/index.ts`](https://github.com/router-for-me/Cli-Proxy-API-Management-Center/blob/main/src/services/api/index.ts)
- [`src/services/api/client.ts`](https://github.com/router-for-me/Cli-Proxy-API-Management-Center/blob/main/src/services/api/client.ts)
- [`src/services/api/authFiles.ts`](https://github.com/router-for-me/Cli-Proxy-API-Management-Center/blob/main/src/services/api/authFiles.ts)
- [`src/services/api/config.ts`](https://github.com/router-for-me/Cli-Proxy-API-Management-Center/blob/main/src/services/api/config.ts)

The exact endpoint request/response schemas are not fully documented in this UI repository. They should be recovered from the matching CLIProxyAPI management API documentation and captured from a running v8 instance before implementation begins.

### State and persistence

Observed state categories:

- **Auth/session:** API base, management key, remember-password preference, server version/build date, plugin support, connection status.
- **Configuration:** fetched config and cache invalidation.
- **Models:** model list/cache.
- **Quotas:** quota cache and provider state.
- **UI preferences:** language and theme.
- **Notifications:** global success/error messages.

The reference uses Zustand stores and persists connection data in `localStorage`. The management key is persisted only when remember-password is enabled. The storage helper calls the mechanism reversible obfuscation, not encryption.

This is a compatibility behavior, not a recommended security design. OWASP warns that browser storage is accessible to same-origin JavaScript and should not be used for authentication tokens or credentials when a safer server-side session is possible.

Sources:

- [`src/stores/useAuthStore.ts`](https://github.com/router-for-me/Cli-Proxy-API-Management-Center/blob/main/src/stores/useAuthStore.ts)
- [`src/services/storage/secureStorage.ts`](https://github.com/router-for-me/Cli-Proxy-API-Management-Center/blob/main/src/services/storage/secureStorage.ts)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

### Build, release, and tests

Observed reference setup:

- React 19, TypeScript 6, Vite 8, Zustand, Axios, React Router 7, Motion, CodeMirror 6, SCSS Modules, i18next.
- Bun 1.3.14 is the package manager/runtime declared in `package.json` and README.
- `vite-plugin-singlefile` inlines the application into one HTML document.
- `build` runs TypeScript compilation and Vite build.
- `test` runs Bun tests.
- `verify` runs tests, lint, and build.
- CI runs `bun run verify` on pull requests and pushes to `main`/`dev`.
- Tagged releases build `dist/index.html`, rename it to `management.html`, and attach it to a GitHub release.

Sources:

- [`package.json`](https://github.com/router-for-me/Cli-Proxy-API-Management-Center/blob/main/package.json)
- [`vite.config.ts`](https://github.com/router-for-me/Cli-Proxy-API-Management-Center/blob/main/vite.config.ts)
- [CI workflow](https://github.com/router-for-me/Cli-Proxy-API-Management-Center/blob/main/.github/workflows/ci.yml)
- [Release workflow](https://github.com/router-for-me/Cli-Proxy-API-Management-Center/blob/main/.github/workflows/release.yml)

## 2. Target stack research

### shadcn/ui

shadcn/ui is best treated as a **source-owned component system**, not a runtime component dependency. Its Vite setup uses Tailwind CSS, an `@/*` alias, and locally generated component files.

Relevant primitives for this product:

- `Sidebar`, `Sheet`, `Breadcrumb`, `NavigationMenu` for responsive shell/navigation.
- `Card`, `Badge`, `Alert`, `Progress`, `Skeleton`, `Empty` for dashboard and resource states.
- `Form`, `Field`, `Input`, `Textarea`, `Select`, `Combobox`, `Command`, `Switch`, `Checkbox` for provider/config forms.
- `Dialog`, `AlertDialog`, `Drawer`, `Popover`, `DropdownMenu`, `ContextMenu` for destructive actions and responsive editing.
- `Table`, data-table pattern, `Pagination`, `ScrollArea` for credentials, keys, logs, quotas, and models.
- `Chart` for quota/health trends if the backend supplies time-series data.
- `Code Block` plus CodeMirror 6 for readable config previews and diffs.

Use semantic CSS variables for background, foreground, card, border, focus ring, chart colors, sidebar colors, and radii. Keep the reference product’s visual identity in tokens rather than scattering styles across feature components.

Sources:

- [shadcn/ui Vite installation](https://ui.shadcn.com/docs/installation/vite)
- [shadcn/ui theming](https://ui.shadcn.com/docs/theming)
- [shadcn/ui forms](https://ui.shadcn.com/docs/forms/react-hook-form)
- [shadcn/ui data tables](https://ui.shadcn.com/docs/components/data-table)
- [shadcn/ui charts](https://ui.shadcn.com/docs/components/chart)

### Vercel-style product conventions

“Vercel vibe” means the visual and product language, **not Vercel hosting**:

- Quiet neutral palette, strong typography hierarchy, compact surfaces, clear focus states.
- Fast-feeling navigation, skeleton loading, optimistic UI only where safe, and precise empty/error states.
- Responsive shell with a collapsible sidebar and mobile drawer.
- Small, composable feature modules rather than a monolithic page component.
- Clean dark mode, restrained motion, generous whitespace, and high information density where administration requires it.

The reference application is normally bundled into the CLI Proxy API and opened as `management.html`. That is the compatibility deployment we should preserve. Vercel documentation remains useful as a design reference and confirms that ordinary Vite static output is portable, but no Vercel-specific hosting configuration is required for Hyeria.

Source: [Vercel Vite documentation](https://vercel.com/docs/frameworks/frontend/vite)

### Vite

Vite provides the correct baseline for this UI:

- Fast dev server and HMR.
- Production asset build to `dist`.
- React plugin support.
- Flexible plugin API.
- Static deployment or optional SSR/backend integration.

Vite transpiles TypeScript but does not type-check it, so type-checking remains an explicit CI step.

Do not use `vite preview` as a production server. It is intended for local preview of the production build.

Sources:

- [Vite guide](https://vite.dev/guide/)
- [Vite static deployment](https://vite.dev/guide/static-deploy)
- [Vite features and TypeScript](https://vite.dev/guide/features)

### Vite+

Vite+ is a unified toolchain around Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. It can simplify the project’s development commands, checks, testing, formatting, and task orchestration.

Use it deliberately:

- It does not provide the product API or server architecture.
- Exact release compatibility matters.
- Existing Vite/Vitest/plugin versions should be checked before migration.
- New projects should use `vp create`; existing projects require the Vite+ migration flow.
- Validate with `vp install`, `vp check`, `vp test`, and `vp build`.

Recommended decision: adopt Vite+ for the new project if the team accepts its release maturity and wants one standard toolchain. Keep the application architecture independent of Vite+ commands so it can still build with ordinary Vite/Vitest tooling if necessary.

Sources:

- [Vite+ guide](https://viteplus.dev/guide)
- [Vite+ migration guidance](https://viteplus.dev/guide/migrate)
- [Vite+ repository](https://github.com/voidzero-dev/vite-plus)

## 3. Recommended architecture

### High-level boundary

```text
Browser UI (Vite + React + shadcn/ui)
        |
        | management API requests
        v
CLI Proxy API v8 management service
        |
        +-- provider credentials / OAuth files
        +-- YAML configuration and hot reload
        +-- quotas / models / logs / plugins
        +-- proxy traffic (outside this UI)
```

**Default:** keep the UI as a management client. Do not add a new database, proxy service, or credential broker unless the product requirements explicitly change.

### Suggested project structure

```text
src/
  app/
    router.tsx
    providers.tsx
    query-client.ts
    auth-boundary.tsx
  components/
    ui/                 # shadcn-generated primitives
    shell/              # sidebar, header, mobile navigation
    feedback/           # toasts, errors, confirmation dialogs
  features/
    auth/
    dashboard/
    providers/
    auth-files/
    oauth/
    quota/
    config/
    logs/
    plugins/
    system/
  lib/
    api-client.ts
    api-errors.ts
    connection.ts
    feature-support.ts
    i18n.ts
    validation.ts
  routes/
    login.tsx
    protected-layout.tsx
    dashboard.tsx
    ...
  stores/
    session-preferences.ts
    ui-preferences.ts
  types/
    management-api.ts
```

Avoid a generic `utils` or `services` dump. Each feature should own its query keys, API adapters, schemas, forms, and route UI, while shared API transport and generated types remain centralized.

### Routing

Use React Router with:

- A public login route.
- A protected layout route.
- Nested feature routes.
- Route-level error boundaries.
- Route metadata for page titles, breadcrumbs, and navigation.
- A compatibility redirect map for `/dashboard`, `/settings`, and `/api-keys`.
- Conditional plugin routes based on server capability discovery.

Use a **dual routing/build strategy**:

1. **Backend/single-file build:** hash routing, matching the reference’s `createHashRouter` behavior so nested screens work when the backend serves only `management.html` and cannot rewrite arbitrary paths.
2. **Normal static build:** browser-history routing may be enabled when the host can rewrite routes to the entry document. This is optional and must not be required for official compatibility.

Keep route definitions shared. Select the router/build mode through a small runtime/build adapter rather than duplicating feature pages.

### Server state and UI state

Use TanStack Query for:

- Config reads and writes.
- Providers and provider models.
- Auth files.
- Quotas.
- Logs and polling.
- Plugin metadata/resources.
- System/version/model status.

Use Zustand or React state only for:

- Theme and language.
- Sidebar state.
- Transient dialogs/notifications.
- Non-sensitive connection form drafts.
- Feature flags derived from current connection.

Do not recreate a second cache in every Zustand store. Query keys and invalidation should make refresh behavior explicit.

Sources:

- [TanStack Query overview](https://tanstack.com/query/latest/docs/framework/react/overview)
- [React guidance on Effects](https://react.dev/learn/you-might-not-need-an-effect)

### API client

Implement one typed transport layer with:

- Base URL normalization and `/v8/management` handling.
- Bearer header injection only while a connection is active.
- Request timeout and cancellation via `AbortSignal`.
- Normalized error envelopes.
- 401 handling that invalidates the session.
- Version/build/plugin-support response-header extraction.
- Multipart upload/download helpers.
- Connection-revision or request-scope guards so responses from an old instance cannot overwrite state after switching instances.

Generate or hand-maintain types from a versioned OpenAPI document where the backend API supports it. The frontend can provide friendly validation, but backend validation remains authoritative.

### Authentication recommendation

There are two deployment modes:

#### Mode A: compatibility client

Browser directly calls the CLIProxyAPI management API with the management key. This best preserves the reference product and supports backend-hosted `management.html`.

Risks:

- The key is exposed to browser JavaScript while connected.
- CORS and remote management must be configured correctly.
- “Remember password” is a sensitive compatibility feature.
- XSS becomes a credential-theft risk.

Mitigations:

- Default to session-memory-only credentials.
- Make persistence opt-in and warn clearly that it is not encryption.
- Never send credentials to analytics/logging systems.
- Apply a strict CSP where hosting permits.
- Avoid arbitrary HTML/plugin rendering without sanitization.
- Clear all query caches and connection state on logout/401.

#### Mode B: secure hosted control plane

Browser authenticates to a backend-for-frontend. The BFF holds the upstream management key in an encrypted server-side store and exposes a narrow session API using an HttpOnly, Secure, SameSite cookie.

Use this only if the product should become a multi-user hosted control plane. It adds:

- Identity provider integration.
- Session and CSRF handling.
- Instance registration and authorization.
- Secret storage and rotation.
- Audit logs.
- SSRF and egress controls if the BFF connects to arbitrary instances.
- A database and operational burden.

Do not build Mode B merely to deploy a visual redesign.

### Config/YAML editor

Preserve the reference’s high-value flow:

1. Fetch current server config.
2. Offer visual editing for common fields.
3. Offer raw YAML editing for advanced fields.
4. Parse and validate locally.
5. Show a before/after diff.
6. Require explicit confirmation for destructive or broad changes.
7. Send the write to the management API.
8. Invalidate config-dependent queries and show server-side errors.
9. Provide reload/refresh state and clear conflict handling.

Use CodeMirror 6 for YAML, search, syntax highlighting, and merge/diff views. Treat raw YAML as a first-class escape hatch, not a hidden developer mode.

### Providers, auth files, and OAuth

Model these as separate feature slices:

- Provider configuration and API keys.
- Auth file inventory and upload/download/delete.
- OAuth/device flows with explicit progress/error states.
- Model aliases and exclusions.
- Provider-specific quota adapters.

Do not force all providers into one giant form. Use a shared provider shell plus provider-specific schemas and panels. This keeps additions localized as the backend grows.

### Logs and quotas

For logs:

- Keep polling or streaming transport behind a feature API.
- Add search, severity/status filters, management-traffic toggle, pause/resume, and download.
- Virtualize long lists.
- Redact tokens and sensitive provider payloads before rendering or exporting.
- Treat log download as a privileged action.

For quotas:

- Normalize provider-specific responses into a common view model.
- Preserve provider-specific details in an expandable panel.
- Show stale/loading/error states independently per provider.
- Use charts only when the API has meaningful time-series data; do not manufacture analytics from a snapshot endpoint.

## 4. Security and operational risks

### Credential exposure

The management key is an admin credential. Browser direct-connect mode necessarily exposes it to the current page’s JavaScript context. Reversible obfuscation does not change that.

Minimum controls:

- No credential persistence by default.
- Explicit warning for remembered sessions.
- Session timeout/clear action.
- Strict Content Security Policy where possible.
- No third-party scripts, ads, or remote fonts in the admin surface.
- Redaction in errors, logs, telemetry, support bundles, and crash reports.
- Do not include keys in URLs, route state, or referrer-bearing links.

### CORS and CSRF

Direct browser access requires the CLIProxyAPI server to permit the UI origin. If a BFF uses cookies, state-changing requests require CSRF defenses and explicit origin checks. Never use wildcard origins with credentialed requests.

Source: [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/CSRF_Prevention_Cheat_Sheet.html)

### SSRF and arbitrary instances

If a hosted BFF lets an admin enter arbitrary CLIProxyAPI URLs, the backend becomes an SSRF boundary. Validate URL scheme and destination, block loopback/private/link-local/metadata ranges, re-check redirects and DNS resolution, and apply network egress controls.

Source: [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SSRF_Prevention_Cheat_Sheet.html)

### Environment variables

Vite exposes `VITE_*` variables to browser code at build time. They are not secrets. Only use them for public configuration such as a default API origin or build metadata. Keep upstream keys, session secrets, database credentials, and encryption keys server-side.

Sources:

- [Vite env variables and modes](https://vite.dev/guide/env-and-mode)
- [Vercel Vite environment variables](https://vercel.com/docs/frameworks/frontend/vite)

### Observability

Add structured, privacy-conscious observability to any new backend/BFF:

- Request/correlation ID.
- Endpoint latency and status rates.
- Auth failures and admin mutations.
- Upstream/provider failures.
- Timeouts and retry counts.
- Database saturation if persistence is introduced.
- Redaction of bearer tokens, OAuth codes, provider keys, config secrets, and raw prompts/responses.

Source: [OpenTelemetry documentation](https://opentelemetry.io/docs/)

## 5. Delivery plan

### Phase 0 — behavior and contract baseline

**Goal:** remove uncertainty before building screens.

Deliverables:

- Run a real CLIProxyAPI v8 instance.
- Inventory every route, feature, request, response, error, and permission.
- Capture sanitized golden fixtures for login, config read/write, provider operations, auth files, OAuth, quotas, logs, models, plugins, and system status.
- Identify which endpoints are stable compatibility requirements versus implementation details.
- Decide whether direct browser mode is sufficient.
- Decide whether single-file `management.html` remains required.

Exit criteria:

- Feature matrix approved.
- API contract source identified.
- Security model and deployment modes written down.

### Phase 1 — project foundation

**Goal:** establish the UI shell and toolchain.

Deliverables:

- Scaffold React + TypeScript + Vite.
- Initialize shadcn/ui and semantic tokens.
- Adopt and validate Vite+ immediately.
- Configure React Router, TanStack Query, i18n, theme, lint/format/type checks, and Vitest.
- Configure shared routes with hash routing for the official backend-hosted build and optional browser routing for the normal static build.
- Add CI commands: `vp install`, `vp check`, `vp test`, type-check, and both build targets.
- Add a single-file release path that emits `management.html`, plus a normal static `dist/` build.

Exit criteria:

- Empty shell builds in both normal and single-file modes.
- Hash deep links work from backend-hosted `management.html`.
- Optional browser-history deep links work on a rewrite-capable static host.
- Local and CI checks pass.
- No secrets are present in client env variables.

### Phase 2 — vertical slice: connection and dashboard

**Goal:** validate architecture end to end.

Deliverables:

- Login/connection form.
- API client and error normalization.
- Protected layout.
- Logout/401 handling.
- Dashboard server-status/version/model summary.
- Theme/language preferences.
- Loading, empty, offline, timeout, unauthorized, and backend-version states.

Exit criteria:

- A user can connect to a v8 instance and recover from failure.
- Switching API instances cannot leak stale data across sessions.
- Critical flow has unit, API-mock, and browser E2E coverage.

### Phase 3 — core management parity

Implement in this order:

1. Configuration read/edit/YAML/diff/save.
2. Provider workbench.
3. Auth file list/upload/download/delete.
4. OAuth/device flows.
5. Quotas.
6. Logs.

Each slice must include:

- API adapter and query keys.
- Zod schemas for client feedback.
- Loading/error/empty states.
- Permission/feature-support behavior.
- Accessibility checks.
- Regression fixtures.

### Phase 4 — plugins and system

Deliver:

- Plugin capability detection.
- Plugin management and store.
- Plugin resource navigation.
- System/version/update/model tools.
- Safe plugin resource rendering and failure fallback.

If plugins can supply HTML/URLs/scripts, define a strict trust model before implementation. Prefer constrained data-driven resources over arbitrary script execution.

### Phase 5 — hardening and release

Deliver:

- Security review and dependency audit.
- Credential leakage tests.
- CORS/CSRF tests for hosted mode.
- SSRF tests if a BFF or remote-instance registry exists.
- Large-log performance tests.
- Mobile/keyboard/screen-reader verification.
- Build-size and startup measurements.
- Staging deployment and rollback procedure.
- Release artifact compatibility test against the actual CLIProxyAPI backend.

## 6. Testing strategy

### Unit tests

Cover:

- API URL normalization.
- Header/version/capability parsing.
- Error normalization.
- Provider/config transformations.
- YAML parse/serialize validation.
- Model alias/exclusion rules.
- Quota normalization.
- Redaction and export behavior.

### API contract tests

Use a versioned OpenAPI document or captured backend fixtures to verify:

- Request paths/methods/headers.
- Success response schemas.
- Error envelopes/status codes.
- Multipart uploads/downloads.
- 401 behavior.
- Capability/version headers.

Source: [OpenAPI Specification](https://spec.openapis.org/oas/latest.html)

### Integration tests

Cover:

- Login and logout.
- Cache invalidation after config/provider/auth-file mutations.
- Connection switching and stale request suppression.
- OAuth progress/error transitions.
- Log polling cancellation.
- Feature gating for unsupported plugins/endpoints.

### E2E tests

Keep a small high-value suite:

- Connect to a test CLIProxyAPI instance.
- Read and safely mutate a test config.
- Upload/delete a fixture auth file.
- Trigger a mock OAuth flow.
- Read quotas/logs.
- Logout and verify protected-route behavior.
- Load every hash deep-linked route from the backend-hosted `management.html` artifact.
- If the normal static/browser-router build is enabled, load every history deep link on a rewrite-capable host.

### Security tests

- No bearer key in URL, document title, analytics, or error telemetry.
- No sensitive values in browser console or rendered error details.
- Remembered-session warning and clear behavior.
- Unauthorized API calls clear state.
- Cookie flags and CSRF if BFF mode exists.
- CORS allowlist behavior.
- SSRF bypass attempts if remote instance URLs are server-side fetched.

## 7. Decisions to make before implementation

## Confirmed product decisions

1. **Compatibility scope:** official UI feature parity against the CLI Proxy API v8 Management API.
2. **Deployment:** backend-hosted `management.html` is the primary compatibility target; also provide a normal static build. Vercel hosting is not required.
3. **Credential model:** browser-side management-key mode is supported for parity; use memory-only storage by default, with an explicit opt-in remembered-session option. A future BFF mode remains possible but is not required for v1.
4. **Routing:** dual build strategy—hash routing for the official single-file/backend build, optional browser-history routing for rewrite-capable static hosting.
5. **Vite+:** adopt immediately.
6. **Plugins:** included in the parity scope.
7. **Analytics:** included as a Hyeria feature, implemented against available usage/log endpoints first and expanded with persistence only where the backend data supports it.
8. **Supported backend versions:** v8 feature parity; no v0 implementation.
9. **OAuth:** reproduce the official UI’s browser/backend OAuth and device-flow behavior.
10. **Branding/license:** product name **Hyeria**, GNU AGPLv3, logo deferred until supplied by the user.

## Recommended initial scope

For the smallest complete first release:

- v8 backend only.
- Direct browser management-client mode, with memory-only credentials by default.
- Backend-hosted single-file `management.html` plus a normal static build.
- Shared feature routes with hash routing in the official artifact and optional history routing in the static artifact.
- Login, protected shell, dashboard, configuration, providers, auth files, OAuth, quotas, logs, plugins, plugin resources, system, and usage analytics.
- No new proxy forwarding, hosted identity, or arbitrary remote-instance BFF in v1.
- Product name Hyeria, GNU AGPLv3, with logo integration deferred.

This preserves the reference product’s job while delivering the requested visual/tooling modernization without creating a second security-sensitive control plane.

## Known limitations of this research

- No live CLIProxyAPI instance was available, so endpoint payloads and runtime behavior were not executed.
- The entire reference tree was not read file-by-file; feature directories and representative source files were inspected.
- Backend-side authorization, persistence, rate limits, and remote-management enforcement are outside the management-center repository and require separate verification.
- “Vercel vibe” is interpreted as a visual/product and deployment direction, not a precise official framework requirement.
- Exact Vite+ release compatibility should be checked immediately before scaffolding because the toolchain is actively evolving.
