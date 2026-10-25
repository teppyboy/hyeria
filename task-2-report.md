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
- `vp check` after integration — passed with 0 errors and 7 existing warnings in unrelated files.

## Risks / integration notes

- This branch intentionally does not add or alter `src/lib/api/client.ts` or `src/features/demo/api.ts`; it depends on Task 1's planned `ManagementApiTransport` and `createDemoApi()` exports.
- Integration updated the session client type to use `ManagementApiTransport` directly.
- Existing preferences still use local storage as normal application behavior; demo session bootstrap itself does not access remembered-session storage or credentials.

# Task 2 review follow-up — safe view validation

## Scope

Updated the source-preserving configuration patch seam after review. Registered values are now validated against their field kind, select options, and numeric constraints before entering the safe view. Proxy URLs with any authority userinfo marker, including an empty userinfo segment such as `http://@proxy.example`, are hidden from the safe view and rejected for visual edits.

## Changed files

- `src/features/config/editor/patch.ts` — validates safe-view values and detects empty proxy userinfo.
- `test/features/config/config-editor-patch.test.ts` — adds invalid scalar/enum/numeric and proxy-userinfo regressions.

## Validation

- `pnpm exec vp test test/features/config/config-editor-registry.test.ts test/features/config/config-editor-patch.test.ts test/features/config/config-api.test.ts test/lib/config/yaml.test.ts` — passed, 4 files / 53 tests.
- `pnpm exec vp check src/features/config/editor/patch.ts test/features/config/config-editor-patch.test.ts` — passed with no warnings, lint errors, or type errors.
- `git diff --check` — passed.

## Risks / integration notes

- No UI, routes, locales, About, API calls, or push operations were changed.
