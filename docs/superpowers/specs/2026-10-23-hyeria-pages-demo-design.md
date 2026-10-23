# Hyeria GitHub Pages Interactive Demo — Design Spec

**Status:** Draft for user review
**Date:** 2026-10-23

## Purpose

Publish a public GitHub Pages preview that lets visitors explore the actual Hyeria management-center UI and try representative actions without operating a CLI Proxy API backend or supplying credentials.

## Agreed requirements

- Use the real Hyeria pages and shared component tree, not a separate showcase implementation.
- Run a dedicated demo build with an in-memory mock of the supported v8 management API.
- Simulate mutations within the current page session. Reload resets all data to safe fixtures; do not persist demo state in local/session storage, IndexedDB, or remote services.
- Never send demo requests to a visitor-supplied host, the default local API, or an external backend.
- Do not collect or accept management credentials in demo mode.
- Publish under the repository’s GitHub Pages project path using hash routing.
- Deploy from a separate GitHub Actions workflow; do not change normal static/management builds or make the existing CI workflow deploy.

## Architecture

### Build isolation

Introduce a `demo` build mode with explicit entry configuration. It selects hash routing and enables demo mode at compile time. The standard static and management entry points remain unchanged. The demo entry should initialize a dedicated demo connection before rendering protected routes, so the public route opens on the dashboard instead of the login form.

The demo mode must be selected at build time, not by a visitor-editable query parameter or runtime API address. The demo API adapter must be the only transport in this build. It will not instantiate the normal `ManagementApiClient` and will not read/write remembered connection storage.

### Mock API

Add a focused in-memory mock implementing the v8 endpoint subset already used by the showcased pages. Seed it with clearly illustrative, non-sensitive values for server/system status, auth-file metadata, quota, logs, config YAML/JSON, plugin metadata, and live usage summary. Do not include plausible real API keys, passwords, OAuth codes, callback tokens, or personal data.

The adapter accepts method/path/query/body and returns endpoint responses matching existing feature schemas. It updates in-memory state for supported user actions (for example config save, auth-file status/delete/refresh, log clear, quota cooldown reset, and plugin actions supported by current pages). State lives only in the page’s JavaScript memory and is recreated from fixtures on reload. Unsupported operations return safe not-supported responses; the mock must not invent semantics beyond UI behavior needed to demonstrate a currently implemented feature.

### Demo UX and safety

Show a persistent, accessible banner identifying the site as an interactive demo and stating that actions are simulated and reset on reload. Login/connect and management-key controls are not part of demo navigation. If normal app code reaches its login route in demo mode, render a demo-specific explanation/navigation rather than a credential form.

Ensure no network request to `/v8/management` or another API origin is possible in the demo build. All feature APIs used by the demo must resolve through the mock adapter. Add tests that fail if the demo transport invokes global `fetch`, attempts a non-local external URL, or touches remembered-session storage.

### GitHub Pages workflow

Add a dedicated workflow triggered by pushes to the default branch and manual dispatch. It will:

1. Check out source and install the project toolchain/dependencies using the existing repository conventions.
2. Build the demo with Vite’s base path set to `/${repository-name}/` (including correct project-page asset paths).
3. Run demo-specific/unit safety checks and scan the artifact for credential sentinels or backend endpoint configuration.
4. Upload only the demo output directory as the Pages artifact.
5. Deploy with the official Pages artifact/deployment actions and minimal `pages: write` / `id-token: write` permissions, protected by the `github-pages` environment.

The workflow must not publish `dist/`, `dist-management/`, tests, or other source artifacts. README will document the Pages preview URL pattern and clarify the demo is not connected to a real backend.

## Testing and acceptance criteria

- Demo build completes and renders the dashboard at the repository project URL with hash routes.
- Demo displays a persistent simulated-action notice and has no credential entry path.
- Representative pages render schema-valid fixture data.
- At least one mutation per relevant category updates the UI in memory; reload restores baseline fixture values.
- Browser/network tests prove the demo makes no external API requests and never stores a key/session.
- Demo artifact scan passes; standard `vp build`, management build, existing unit suite, release gates, and regular CI continue to pass.
- GitHub Pages workflow uploads only the dedicated demo artifact and deploys using repository Pages environment permissions.

## Non-goals

- No real backend access, proxying, analytics collection, or persistence.
- No mock implementation of unsupported or undocumented v8 endpoints merely for visual completeness.
- No modifications to production API/session semantics outside a compile-time demo seam.
- No separate showcase UI to duplicate existing product components.

## Risks and mitigations

- **Accidental live requests:** use a compile-time demo build and dedicated adapter; test by replacing/monitoring global fetch and asserting no external calls.
- **Credential exposure through fixtures:** use clearly synthetic demo data and artifact scanning; never reuse test config hashes as if they were credentials.
- **GitHub Pages base-path errors:** build with the repository-name base and verify generated HTML asset references.
- **Behavior drift:** mock only the documented/implemented UI subset and cover request/response contracts with tests.
