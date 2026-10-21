# Hyeria Management Center — Architecture Specification

**Status:** Approved design, pending written-spec review  
**Date:** 2026-10-21  
**Product:** Hyeria  
**License:** GNU Affero General Public License v3.0 (AGPLv3)  
**Primary compatibility target:** CLI Proxy API v8 Management API  
**Implementation stack:** React, shadcn/ui, Vite, Vite+

## 1. Purpose and success criteria

Hyeria is a modern reimplementation of the CLI Proxy API Management Center. It provides feature parity with the official management UI while using a shadcn/ui component system, a Vercel-inspired visual language, Vite for application delivery, and Vite+ as the project toolchain.

Hyeria is a **management client**, not a proxy server. It connects to a separately running CLI Proxy API v8 instance and manages that instance through `/v8/management`. It does not forward model traffic, replace the backend’s configuration persistence, or create a second proxy implementation.

Success means:

- Existing CLI Proxy API v8 users can perform the official UI’s management workflows through Hyeria.
- The official backend-hosted deployment remains supported as a single `management.html` artifact.
- A normal static build is also available for development and optional alternate hosting.
- The application is responsive, accessible, multilingual, themeable, and operationally understandable.
- Plugins and plugin-defined resources are supported without making arbitrary plugin code part of the trusted UI runtime.
- Analytics are available where backend data supports them, without falsely implying durable history from ephemeral queues.
- Browser-side management credentials remain supported for compatibility, with memory-only use as the default.

The logo is intentionally deferred until the product owner supplies it. A temporary text/placeholder mark is acceptable during implementation.

## 2. Non-goals

The first implementation does not:

- Implement or fork the CLI Proxy API proxy runtime.
- Replace the CLI Proxy API v8 backend.
- Implement new hosted multi-user identity, billing, or tenant management.
- Require Vercel hosting or Vercel infrastructure.
- Implement the deprecated v0 Management API as a new compatibility target.
- Introduce a backend-for-frontend solely to hide a browser-side management key.
- Invent historical analytics that the connected backend cannot provide.
- Permit arbitrary plugin JavaScript to execute with unrestricted access to the Hyeria page.

A future BFF, identity layer, or durable analytics collector may be added as a separate architectural effort if product requirements change.

## 3. Product and compatibility decisions

### 3.1 Backend and API

- Target CLI Proxy API v8 only.
- Use `/v8/management` for management operations.
- Preserve v8 request/response semantics, including raw configuration node writes, v8 error statuses, OAuth callback exceptions, capability headers, and plugin endpoints.
- Do not build new functionality against `/v0/management`.
- Treat the connected backend as the authority for validation, authorization, persistence, configuration migration, quota state, credentials, and plugin lifecycle.

The canonical API source is the official Management API v8 documentation and a running v8 instance used for sanitized fixtures. Before implementation of each feature, its request/response behavior must be confirmed against that source or an executable test instance.

### 3.2 Deployment

Hyeria has two build outputs from one codebase:

1. **Official management build**
   - Single self-contained HTML file.
   - Output name: `management.html`.
   - JavaScript and CSS inlined.
   - Hash routing.
   - Intended to be copied into or served by the CLI Proxy API host.
   - Must work without server-side route rewrites.

2. **Normal static build**
   - Standard Vite static output under `dist/`.
   - May use browser-history routing when deployed behind a host that rewrites application routes to the entry document.
   - Must not be required for official backend compatibility.
   - Exists for local development, alternate static hosting, previews, and future distribution scenarios.

Route definitions, feature pages, API behavior, and data models are shared. Only the routing adapter and build-specific entry/configuration differ.

“Vercel vibe” refers to the visual and product direction—neutral surfaces, strong typography, compact composable UI, clear states, restrained motion, and polished dark mode. It does not select Vercel as a hosting platform.

### 3.3 Credentials

The compatibility mode is direct browser-to-backend management API access using the management key.

Required behavior:

- Send `Authorization: Bearer <management key>` for authenticated management calls.
- Keep the key in memory by default.
- Make remembered sessions an explicit opt-in.
- Clearly warn that browser persistence is not encryption.
- Never put the key in a URL, route state, document title, telemetry payload, log, error report, or downloadable diagnostic bundle.
- Clear the key, cached server state, and connection metadata on logout and unauthorized responses.
- Do not log raw API requests containing credential material.

A future secure hosted mode may use a BFF with HttpOnly cookies, CSRF protection, server-side secrets, and an allowlisted instance registry. It is not part of this implementation unless separately approved.

### 3.4 Licensing and identity

- Product name: Hyeria.
- Project license: GNU AGPLv3.
- Include the license, copyright/attribution notices, source/build instructions, and appropriate interactive legal notices.
- Mark the product as an independent reimplementation/alternative where appropriate.
- Preserve required notices for reused or adapted code and review third-party asset licenses before bundling provider marks or logos.
- Do not ship the final logo until supplied by the product owner.

## 4. User journeys and feature scope

### 4.1 Connection and session

1. User opens the login screen.
2. Hyeria derives a sensible API address from the current page location when possible.
3. User may edit the API address and enters the management key.
4. Hyeria normalizes the base URL and probes the v8 configuration endpoint.
5. On success, it captures server version/build metadata and feature capabilities.
6. User enters the protected management shell.
7. A 401 clears the session and redirects to login with a useful explanation.
8. User can explicitly disconnect and clear local connection data.

The client must guard against stale requests when the user switches between API instances. Responses belonging to a previous connection must not overwrite the current instance’s state.

### 4.2 Management areas

The parity scope includes:

- Dashboard: connection status, server version/build, model availability, provider/account health where exposed.
- Quick start/provider workbench.
- AI provider configuration: Gemini, Codex, Claude, Vertex, OpenAI-compatible groups, and backend-advertised providers.
- Client API keys and upstream provider key groups.
- Auth files: list, status, enable/disable, field updates, upload, download, delete, refresh, and model metadata.
- OAuth: browser authorization, device flows, polling, cancellation, callback completion, and Vertex import.
- Model aliases and excluded-model rules.
- Quotas and provider-specific usage/reset operations.
- Configuration: visual editor, raw YAML editor, parsing/validation, before/after diff, save, conflict/error handling.
- Logs: incremental refresh/polling, search, filters, management-traffic visibility, clear, request-error listing, and download.
- Plugins: discovery, enablement/configuration, store catalog, installation/update/removal, restart-required states, plugin quotas, and plugin-defined menu/resource pages.
- System: version/update information, model discovery, local session cleanup, and backend capability information.
- Internationalization: English, Simplified Chinese, Traditional Chinese, and Russian initially, with browser-language detection and manual selection.
- Themes: system/automatic, light, white, and dark variants where the design system supports them.
- Responsive desktop, tablet, and mobile layouts.

Feature availability must follow backend capability/version signals. Unsupported operations must produce an explicit disabled or unavailable state rather than a broken navigation path.

## 5. Information architecture and routing

Use a protected application shell with a responsive sidebar/header:

- Operate: dashboard, quick start.
- Gateway: providers, auth files, OAuth.
- Observe: quotas, logs, analytics.
- Control: configuration, plugins, plugin store, system.
- Plugin pages: dynamically discovered resources.

Canonical route families:

```text
/login
/
/dashboard                 -> dashboard compatibility alias
/quick-start
/ai-providers
/auth-files
/auth-files/oauth-excluded
/auth-files/oauth-model-alias
/oauth
/quota
/logs
/analytics
/config
/settings                  -> redirect to /config
/api-keys                  -> redirect to /config
/plugins
/plugin-store
/plugin-pages/:pluginId/:menuIndex
/system
```

The route table is shared across builds. The official artifact uses hash routing; the normal static build can use browser routing when the deployment host supports rewrites. Navigation metadata, breadcrumbs, page titles, feature gates, and redirects are defined once and consumed by both router modes.

Each route owns an error boundary and a page-level loading state. Global shell failures must not expose credentials or raw backend payloads.

## 6. Technical architecture

### 6.1 Project layout

```text
src/
  app/
    entry/
    providers/
    router/
    auth-boundary/
  components/
    ui/                  # shadcn/ui-owned components
    shell/               # sidebar, header, mobile navigation
    feedback/            # toasts, dialogs, error surfaces
  features/
    auth/
    dashboard/
    providers/
    auth-files/
    oauth/
    quota/
    config/
    logs/
    analytics/
    plugins/
    system/
  lib/
    api/
    connection/
    errors/
    feature-support/
    i18n/
    security/
    formatting/
  routes/
  stores/
    preferences/
    ui/
  types/
  styles/
```

Feature modules own their API adapters, query keys, validation schemas, forms, route UI, and feature-specific view models. Shared modules contain only genuinely cross-feature behavior.

### 6.2 UI system

Initialize shadcn/ui for Vite with Tailwind and the `@/*` source alias. Use local component source files, not an opaque hosted component runtime.

Core primitives include:

- Sidebar, Sheet, Breadcrumb, Navigation Menu.
- Card, Badge, Alert, Progress, Skeleton, Empty.
- Form/Field/Input/Textarea/Select/Combobox/Command/Switch/Checkbox.
- Dialog/AlertDialog/Drawer/Popover/Dropdown Menu/Context Menu.
- Table, pagination, scroll area, resizable panels.
- Chart primitives only where backend data justifies visualization.

Design tokens cover background/foreground, card, muted surfaces, borders, focus rings, destructive states, chart palette, sidebar palette, radii, typography, spacing, and motion. Dark mode changes tokens, not component markup.

Accessibility requirements:

- Keyboard-complete navigation.
- Visible focus states.
- Correct labels and descriptions.
- Dialog focus management.
- Live-region notifications for async mutations.
- Table headers and row actions accessible without pointer input.
- Reduced-motion support.
- Color never the only status signal.
- Mobile controls usable with touch targets and screen readers.

### 6.3 Data and state

TanStack Query is the primary server-state layer. Query keys are feature-owned and invalidation is explicit after mutations.

Server-owned query domains:

- Connection/configuration.
- Providers and models.
- Credentials/auth files.
- OAuth sessions.
- Quotas.
- Logs and request-error logs.
- Plugins and plugin store.
- System/version/model information.
- Usage/analytics data.

Zustand or local React state is limited to:

- Theme and language preferences.
- Sidebar/mobile shell state.
- Notifications and transient dialogs.
- Non-sensitive drafts and local UI filters.
- Current connection metadata needed by the transport layer.

Do not duplicate server caches across Zustand stores. A logout or connection switch must clear all query domains belonging to the old instance.

### 6.4 API transport

Create one typed management API transport with:

- URL normalization that accepts host-only, scheme-qualified, and management-suffixed inputs.
- `/v8/management` base-path resolution.
- Bearer authentication.
- Request timeout and abort support.
- Normalized error objects retaining safe status/code/message details.
- 401 event/session invalidation.
- Response header parsing for server version, build date, and plugin support.
- JSON, YAML, multipart upload, and binary download support.
- Connection revision/request ownership guards.
- No raw credential or sensitive-body logging.

API types should be derived from a versioned contract where possible and supplemented by sanitized executable fixtures from a real v8 backend. Frontend schemas improve feedback; backend validation remains authoritative.

### 6.5 Configuration editor

The configuration workflow is:

1. Fetch v8 JSON/YAML representation.
2. Render common settings through focused forms.
3. Expose raw YAML for advanced configuration.
4. Parse and validate locally.
5. Show a diff against the loaded document.
6. Confirm broad/destructive changes.
7. Write through the correct v8 endpoint and content type.
8. Invalidate affected queries after success.
9. Surface backend validation, read-only-field, migration, and write errors precisely.

CodeMirror 6 remains the editor foundation. YAML replacement and node-level configuration writes must preserve v8 body semantics; legacy `{ value: ... }` envelopes are not valid for new v8 configuration paths.

### 6.6 OAuth and credential flows

OAuth is a backend-coordinated browser flow:

- Request provider auth URL or device flow.
- Open/redirect the user to the returned URL.
- Track state and provider.
- Poll status while pending.
- Complete callback without requiring the normal management middleware where the backend defines that exception.
- Allow cancellation.
- Refresh credentials and update the auth-file list.
- Show provider-specific errors without exposing authorization codes or tokens.

Credential upload/download/delete and provider-specific fields remain explicit, confirmation-protected operations.

### 6.7 Plugins

Plugin support is data-driven:

- Discover backend-advertised plugins and menus.
- Build navigation from safe metadata.
- Render known resource types through constrained Hyeria components.
- Keep plugin configuration under the v8 config API.
- Surface install/update/remove/restart-required states.
- Treat store installation as a privileged operation that can download executable artifacts.
- Never interpolate untrusted plugin HTML into the DOM without sanitization.
- Do not execute arbitrary plugin JavaScript in the main page context.

If the official backend exposes a resource type that cannot safely be rendered, show a clear unsupported-resource state rather than silently running arbitrary code.

### 6.8 Analytics

Analytics is included as a Hyeria feature with a staged data model:

1. **Live/ephemeral:** usage queue, API-key usage buckets, logs, quota snapshots, and provider/model status.
2. **Browser-derived:** summaries calculated from currently fetched data, clearly labeled as session-scoped.
3. **Durable history:** optional collector/database integration only when explicitly introduced and operationally configured.

The initial analytics UI must not imply durable history if the source is an in-memory queue. It should show data freshness, sampling/coverage limits, and unavailable states.

Potential future collector architecture is separate from the management client:

```text
CLIProxyAPI usage data -> optional Hyeria collector -> SQLite/Postgres -> analytics UI
```

## 7. Dual-build implementation

Use Vite+ tasks/configuration to expose two application builds:

```text
vp dev                         # normal development
vp check                       # format, lint, type checks as configured
vp test                        # unit/integration tests
vp build                       # normal static build to dist/
vp run build:management        # single-file build to dist-management/management.html
```

The management build may use a Vite single-file plugin compatible with the selected Vite+ release. Compatibility must be proven in the first foundation milestone; if the plugin is incompatible, use a Vite+ supported Rollup/Rolldown output hook that inlines CSS and JavaScript without changing application code.

Build-specific settings:

- `VITE_HYERIA_ROUTER_MODE=hash` for official management output.
- `VITE_HYERIA_ROUTER_MODE=history` or equivalent for optional normal static output.
- Build metadata injected without exposing secrets.
- No external runtime asset requirement for `management.html`.
- Stable output naming and artifact smoke test.

## 8. Security model

### 8.1 Browser credentials

The management key is an administrative credential and is necessarily available to page JavaScript in direct-connect mode. Therefore:

- Memory-only is the default.
- Persistence is opt-in and visibly labeled.
- Persistent storage must never be described as encrypted.
- Strict content security policy should be documented for hosts that can configure it.
- Avoid third-party scripts, analytics, remote fonts, and untrusted HTML in the admin artifact.
- Redact keys from errors, logs, support exports, and telemetry.

### 8.2 Backend trust boundaries

The backend remains authoritative for:

- Authentication and authorization.
- Remote-management enablement.
- Failed-attempt bans.
- Configuration validation and migration.
- Credential storage and provider requests.
- Arbitrary authenticated upstream calls.
- Plugin installation and executable artifact handling.

Hyeria must not claim that client-side validation protects the backend.

### 8.3 Hosted/BFF future mode

If a future hosted control plane is added, it must use:

- Server-held upstream management keys.
- HttpOnly, Secure, appropriately SameSite cookies.
- CSRF defenses and explicit origin validation.
- Strict CORS allowlists.
- SSRF protections for user-supplied instance URLs.
- Egress controls and private/metadata IP blocking.
- Audit logging and secret rotation.

This is explicitly outside the first implementation.

## 9. Testing and verification

### Unit

- Connection URL normalization.
- v8 path/body semantics.
- Header/capability parsing.
- Error normalization and safe redaction.
- Provider/config transformations.
- YAML parse/serialize/validation/diff.
- Alias/exclusion rules.
- Quota normalization.
- Analytics freshness/coverage labels.
- Router-mode selection.

### Contract and integration

Use sanitized v8 fixtures and, where possible, a disposable real backend:

- Login/config probe.
- 401 and session invalidation.
- Configuration GET/PUT/PATCH/DELETE.
- Credential multipart operations.
- OAuth start/status/cancel/callback.
- Quotas and reset operations.
- Logs, cursors, clearing, and downloads.
- Plugin capability/resource/store behavior.
- Stale response suppression after connection switching.

### E2E

Maintain a small critical-flow suite covering:

- Login and protected navigation.
- Dashboard loading.
- Safe config edit and save.
- Provider mutation.
- Auth-file lifecycle.
- Mock OAuth/device flow.
- Quota/log viewing.
- Plugin navigation.
- Logout and protected-route rejection.
- Hash deep links from `management.html`.
- Normal static build deep links when history routing is enabled.

### Security and quality

- No key in URL, title, console, telemetry, or rendered backend error.
- Remembered-session warning and clear behavior.
- Keyboard and screen-reader flows.
- Reduced-motion behavior.
- Large-log rendering and polling cancellation.
- Artifact smoke tests for both build modes.
- Dependency/license audit, including provider assets and generated components.
- AGPL legal-notice visibility and source/build documentation.

## 10. Delivery milestones

### M0 — baseline and contract

- Run/obtain a CLI Proxy API v8 instance.
- Inventory official UI routes and backend operations.
- Capture sanitized request/response/error fixtures.
- Confirm all provider/OAuth/plugin capability variations needed for parity.
- Confirm the Vite+ release and single-file plugin strategy.

### M1 — foundation

- Scaffold Vite+ React TypeScript application.
- Initialize shadcn/ui and design tokens.
- Configure both router modes and both builds.
- Add API transport, query client, i18n, theme, notifications, and legal notices.
- Add CI verification.

Exit: both artifacts build; `management.html` loads from an HTTP server with hash routes; normal `dist` build works in local preview.

### M2 — connection vertical slice

- Login and connection form.
- Protected shell.
- Logout/401 handling.
- Dashboard status/version/models.
- Theme/language.
- Stale-request protections.

Exit: connect, disconnect, reconnect, switch instances, and recover from backend errors reliably.

### M3 — core parity

Implement configuration, providers, credentials, OAuth, quotas, and logs as independent feature slices. Each slice includes API adapters, query invalidation, validation, responsive states, accessibility, and tests.

### M4 — plugins, system, analytics

- Plugin discovery/store/configuration/resource pages.
- System/update/model tools.
- Initial live/session analytics.
- Explicit freshness and unavailable states.

### M5 — hardening and release

- Security/accessibility/performance review.
- Real backend compatibility run.
- CI artifact checks.
- Release notes and AGPL source instructions.
- Staging and rollback procedure.
- Logo integration when supplied.

## 11. Open items resolved or explicitly deferred

Resolved:

- Name: Hyeria.
- License: AGPLv3.
- Backend compatibility: v8 official feature parity.
- Plugins: included.
- Analytics: included, staged according to available data.
- Credential mode: browser-side supported, memory-first.
- Deployment: backend-hosted single-file primary, normal static secondary.
- Routing: dual build strategy.
- Vite+: immediate adoption.
- OAuth: reproduce official browser/backend flow.
- Logo: deferred.

Deferred:

- Hosted BFF/multi-user identity.
- Durable analytics collector/database.
- Additional backend-version adapters.
- Arbitrary plugin scripting/runtime.
- Final provider logo/asset inventory.

## 12. Primary sources

- [CLI Proxy API Management Center README](https://github.com/router-for-me/Cli-Proxy-API-Management-Center/blob/main/README.md)
- [CLI Proxy API Management API v8](https://help.router-for.me/management/apiv8.html)
- [CLI Proxy API README](https://github.com/router-for-me/CLIProxyAPI/blob/main/README.md)
- [Reference app entry and routes](https://github.com/router-for-me/Cli-Proxy-API-Management-Center/blob/main/src/App.tsx)
- [Reference API client](https://github.com/router-for-me/Cli-Proxy-API-Management-Center/blob/main/src/services/api/client.ts)
- [Reference auth store](https://github.com/router-for-me/Cli-Proxy-API-Management-Center/blob/main/src/stores/useAuthStore.ts)
- [shadcn/ui Vite installation](https://ui.shadcn.com/docs/installation/vite)
- [shadcn/ui theming](https://ui.shadcn.com/docs/theming)
- [shadcn/ui forms](https://ui.shadcn.com/docs/forms/react-hook-form)
- [shadcn/ui data table](https://ui.shadcn.com/docs/components/data-table)
- [Vite guide](https://vite.dev/guide/)
- [Vite static deployment](https://vite.dev/guide/static-deploy)
- [Vite+ guide](https://viteplus.dev/guide)
- [Vercel Vite documentation, used only for Vercel-style/static-hosting reference](https://vercel.com/docs/frameworks/frontend/vite)
- [GNU AGPLv3](https://www.gnu.org/licenses/agpl-3.0.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/CSRF_Prevention_Cheat_Sheet.html)
- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)

## 13. Spec self-review

- **Placeholders:** No implementation requirements are left as TBD/TODO. The logo is intentionally deferred and identified as a product asset, not an architecture gap.
- **Consistency:** Backend-hosted `management.html` is primary throughout; Vercel is described as visual direction only. Hash routing is assigned to the official artifact; history routing is optional for normal static output. Vite+ is immediate, while single-file plugin compatibility is an explicit M1 validation task.
- **Scope:** The spec is limited to a management client and its two build outputs. Hosted identity and durable analytics are explicitly separated as future work.
- **Ambiguity:** “Analytics included” is defined as an initial live/session feature with a clear path to optional durable collection. “Feature parity” is defined against the v8 official UI and API, not v0 or undocumented behavior.
- **Legal:** AGPLv3, attribution, notices, asset review, and interactive legal notices are included in the delivery and quality requirements.
