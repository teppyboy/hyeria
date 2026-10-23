# Task 2 report — Bootstrap demo mode

## Scope
Implemented the approved demo bootstrap seam without modifying Task 1-owned API transport files. The demo entry selects hash routing, creates the planned `createDemoApi()` transport, and injects it before rendering the shared app. The session initializer authenticates an ephemeral transport without normal connection probing, API-base normalization, remembered-session reads/writes, or production client construction. The protected shell displays an accessible interactive-demo notice. The login route has demo-specific copy and navigation and does not render address, management-key, or remember-session controls.

## Changed files
- `src/app/entry/demo.tsx` — demo entry and fresh `createDemoApi()` injection.
- `src/app/entry/build-config.ts` — adds demo router mode type.
- `src/app/entry/router-mode.ts` — selects hash routing for demo mode.
- `src/app/entry/render-app.tsx` — optional demo transport injection while preserving existing callers.
- `src/stores/session.ts` — ephemeral demo transport/session initializer and demo state marker.
- `src/features/demo/DemoBanner.tsx` — persistent protected-route notice.
- `src/components/shell/AppShell.tsx` — renders the banner for demo sessions.
- `src/routes/login.tsx` — demo-specific login-route handling without credential inputs.
- `test/features/demo/demo-entry.test.tsx` — session/storage, banner, and demo login-route coverage.

## Validation
- `vp test -- test/features/demo/demo-entry.test.tsx test/features/auth/session.test.ts test/app/router-mode.test.ts` — passed, 3 files / 17 tests.
- `git diff --check` — passed.
- `vp check` — not clean on this isolated baseline: Task 1 API module is absent and feature query functions still expect `ManagementApiClient`; existing unrelated lint warnings also remain. After Task 1 integration, the planned `ManagementApiTransport` changes resolve the expected type boundary and the planned demo module resolves the entry import.

## Risks / integration notes
- This branch intentionally does not add or alter `src/lib/api/client.ts` or `src/features/demo/api.ts`; it depends on Task 1's planned `ManagementApiTransport` and `createDemoApi()` exports.
- The current local type seam uses `Pick<ManagementApiClient, ...>` until integration reconciles it to the exported transport interface.
- Existing preferences still use local storage as normal application behavior; demo session bootstrap itself does not access remembered-session storage or credentials.
