# Operational Command Center Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Hyeria’s entire Operate surface as a black-first Operational Command Center while preserving all current behavior, safety boundaries, localization, and isolated builds.

**Architecture:** Introduce a small set of shared workspace primitives—workspace header, status cells, readiness rows, action groups, and state surfaces—then migrate route families onto those primitives. Keep feature queries, API contracts, route topology, and mutation flows unchanged; make composition and semantic styling the primary change. Motion remains CSS-based and limited to state, hierarchy, and continuity.

**Tech Stack:** React 19, React Router, TypeScript, Tailwind CSS 4, Radix UI, Lucide, Zustand, TanStack Query, Vite+.

**Spec:** `docs/superpowers/specs/2026-10-24-operational-command-center-redesign.md`

## Global Constraints

- Preserve static, management, and isolated demo build separation.
- Preserve all existing routes, backend contracts, localization, credential boundaries, and demo behavior.
- Do not add backend endpoints, polling, metrics, product claims, animation libraries, chart libraries, or visual asset dependencies.
- Do not display endpoints, management keys, credential contents, or sensitive backend metadata in new status surfaces.
- Preserve the redacted configuration diff confirmation before every configuration write.
- Preserve light, white, system, and dark themes; dark remains the default.
- Use one dominant primary action per workspace; separate destructive actions and retain confirmations.
- Use semantic tokens, 44px minimum interactive hit areas, visible keyboard focus, translated labels, and reduced-motion alternatives.
- Use current-session rendered result changes only for status highlight motion; do not add polling solely for animation.

## Review Focus

- Demo mode must remain credential-free, backend-free, synthetic, and reset-on-reload after shell/workspace changes — test in `test/features/demo/demo-entry.test.tsx` and existing demo artifact checks (Task 1).
- Configuration writes must still require the redacted diff confirmation after editor/review layout changes — test in `test/features/config/config-page.test.tsx` and `test/features/config/config-diff-dialog.test.tsx` (Task 4).
- OAuth cancellation, callback completion, expiry, and error recovery must remain reachable after state-machine layout changes — test in `test/features/oauth/oauth-page.test.tsx` and `test/features/oauth/state-machine.test.ts` (Task 4).
- Plugin installation must retain executable-code warnings, safe ID validation, and confirmation after workspace/action-group changes — test in `test/features/plugins/plugin-pages.test.tsx` and `test/features/plugins/plugin-resource-safety.test.tsx` (Task 4).
- Narrow layouts and reduced-motion preferences must retain usable navigation, bounded table overflow, visible focus/status changes, and no spatial choreography — test shell/workspace classes and verify 1440px/390px captures (Task 5).

---

## File and ownership map

- **Shared workspace primitives:** `src/components/workspace/WorkspaceHeader.tsx`, `StatusCell.tsx`, `ReadinessList.tsx`, `WorkspaceState.tsx`, `ActionGroup.tsx`.
- **Shared shell/tokens:** `src/components/shell/AppShell.tsx`, `Header.tsx`, `Sidebar.tsx`, `src/styles/tokens.css`, shared UI primitives as needed.
- **Overview routes:** `src/features/dashboard/routes/DashboardPage.tsx`, `system/routes/SystemPage.tsx`, `quota/routes/QuotaPage.tsx`, `analytics/routes/AnalyticsPage.tsx`.
- **Data-management routes:** `providers/routes/ProvidersPage.tsx`, `auth-files/routes/AuthFilesPage.tsx`, `logs/routes/LogsPage.tsx`, related table/filter/viewer components.
- **Sensitive workflows:** `config/routes/ConfigPage.tsx`, `oauth/routes/OAuthPage.tsx`, `plugins/routes/PluginsPage.tsx`, `plugins/routes/PluginStorePage.tsx`.
- **Translations:** `src/locales/en.json`, `ru.json`, `zh-CN.json`, `zh-TW.json` whenever new UI copy is required.
- **Tests:** existing feature/page tests plus new `test/components/workspace/workspace.test.tsx` and shell tests.

---

### Task 1: Build shared workspace primitives and shell contract

**Files:**
- Create: `src/components/workspace/WorkspaceHeader.tsx`
- Create: `src/components/workspace/StatusCell.tsx`
- Create: `src/components/workspace/WorkspaceState.tsx`
- Create: `src/components/workspace/ActionGroup.tsx`
- Test: `test/components/workspace/workspace.test.tsx`
- Modify: `src/components/shell/AppShell.tsx`, `src/components/shell/Header.tsx`, `src/components/shell/Sidebar.tsx`, `src/styles/tokens.css`
- Test: `test/components/shell/shell.test.tsx`

**Interfaces:**
- `WorkspaceHeader({ title, description?, status?, actions?, children? }: Props)` renders one semantic `h1`, optional description/status, and one action region.
- `StatusCell({ label, value, tone?, detail? }: Props)` renders a labeled static fact/status with semantic tone.
- `WorkspaceState({ kind, title?, description?, action? }: Props)` supports `loading | empty | error | success | unavailable` with semantic live behavior.
- `ActionGroup({ children, destructive? }: Props)` groups secondary/primary actions and applies destructive separation.

- [ ] **Step 1: Write failing primitive tests**
  - Assert `WorkspaceHeader` renders exactly one route-level heading, description, status, and action region.
  - Assert `StatusCell` exposes its label/value and applies semantic tone without embedding raw colors.
  - Assert `WorkspaceState` uses `role="status"` for loading/success and `role="alert"` for errors.
  - Assert `ActionGroup` preserves button order and destructive marker.
  - Extend shell tests for safe connection/demo status, icon-first navigation, 44px controls, and reduced-motion class hooks.

- [ ] **Step 2: Run focused tests to verify failure**
  - Run: `vp test test/components/workspace/workspace.test.tsx test/components/shell/shell.test.tsx`
  - Expected: FAIL because the workspace primitives and new assertions do not exist.

- [ ] **Step 3: Implement primitives and shell migration**
  - Create the four primitives using existing `cn`, `Button`, `Badge`, and token conventions.
  - Keep the current sidebar collapsed preference and hover/focus expansion behavior; refine class names so labels, icons, and rail width animate as one shell contract.
  - Keep header connection labels limited to safe session states; do not render `apiBase` or credentials.
  - Add only semantic CSS tokens and transitions; reduced motion removes transforms/entrance but retains color/focus/status feedback.

- [ ] **Step 4: Run focused tests**
  - Run: `vp test test/components/workspace/workspace.test.tsx test/components/shell/shell.test.tsx`
  - Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add src/components/workspace src/components/shell src/styles/tokens.css test/components/workspace test/components/shell/shell.test.tsx
  git commit -m "feat(ui): add workspace primitives"
  ```

### Task 2: Redesign dashboard as the reference workspace

**Files:**
- Modify: `src/features/dashboard/routes/DashboardPage.tsx`
- Modify: `src/features/dashboard/queries.ts` only if existing result shaping is needed; do not add polling.
- Test: `test/features/dashboard/dashboard.test.tsx`
- Modify: `src/locales/*.json` only for approved dashboard copy.

**Interfaces:**
- Consumes Task 1 primitives and existing `useDashboardQuery()` result shape.
- Produces the reference composition used by later route-family work: workspace header, server-fact strip, readiness overview, model-channel list, and consistent state handling.

- [ ] **Step 1: Add failing dashboard hierarchy assertions**
  - Assert a workspace header exists with one dashboard heading.
  - Assert server facts are distinct status cells.
  - Assert credentials render as readiness information with existing counts.
  - Assert model channels remain visible with existing availability labels.
  - Assert pending/error/empty states remain accessible.

- [ ] **Step 2: Run dashboard tests to verify failure**
  - Run: `vp test test/features/dashboard/dashboard.test.tsx`
  - Expected: FAIL on the new hierarchy selectors.

- [ ] **Step 3: Implement the dashboard composition**
  - Replace the undifferentiated card grid with the approved four-region composition.
  - Keep all existing query fields and translations; do not invent metrics or durable analytics claims.
  - Use static server facts, readiness statuses, and model-channel rows as separate visual roles.
  - Add current-render state-change highlighting only if it can be derived from mounted render values without polling.

- [ ] **Step 4: Run dashboard and related tests**
  - Run: `vp test test/features/dashboard/dashboard.test.tsx test/features/demo/demo-entry.test.tsx`
  - Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add src/features/dashboard test/features/dashboard/dashboard.test.tsx
  git commit -m "feat(dashboard): build operations overview"
  ```

### Task 3: Migrate overview and data-management route families

**Files:**
- Modify: `src/features/system/routes/SystemPage.tsx`
- Modify: `src/features/quota/routes/QuotaPage.tsx`
- Modify: `src/features/analytics/routes/AnalyticsPage.tsx`
- Modify: `src/features/providers/routes/ProvidersPage.tsx`
- Modify: `src/features/auth-files/routes/AuthFilesPage.tsx`
- Modify: `src/features/logs/routes/LogsPage.tsx`
- Modify related feature components only where layout ownership requires it.
- Test: `test/features/system/system-page.test.tsx`, `test/features/providers/providers-page.test.tsx`, `test/features/auth-files/auth-files-page.test.tsx`, `test/features/logs/logs-ui.test.tsx`, and existing quota/analytics tests.

**Interfaces:**
- Consumes Task 1 workspace/state/action primitives and Task 2 dashboard visual language.
- Produces route-specific workspaces with aligned data regions, one primary action where applicable, and bounded table/log overflow.

- [ ] **Step 1: Add failing route-family hierarchy assertions**
  - Assert each route has one workspace header.
  - Assert provider/auth/log routes keep table/filter/viewer landmarks and existing action labels.
  - Assert system/quota/analytics retain their current facts, live-snapshot framing, confirmation behavior, and empty/error states.

- [ ] **Step 2: Run route-family tests to verify failure**
  - Run: `vp test test/features/system/system-page.test.tsx test/features/providers/providers-page.test.tsx test/features/auth-files/auth-files-page.test.tsx test/features/logs/logs-ui.test.tsx test/features/quota test/features/analytics`
  - Expected: FAIL only on new hierarchy assertions.

- [ ] **Step 3: Implement overview/data-management layouts**
  - Use purpose-built workspace headers and status/action regions.
  - Keep existing API/query/mutation code unchanged unless a render-only adapter is required.
  - Keep tables bounded with local horizontal scrolling and preserve accessible labels.
  - Separate destructive auth-file actions from safe actions without changing confirmation flows.
  - Keep analytics explicitly live and non-durable.

- [ ] **Step 4: Run route-family tests**
  - Run the command from Step 2.
  - Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add src/features/system src/features/quota src/features/analytics src/features/providers src/features/auth-files src/features/logs test/features
  git commit -m "feat(ui): redesign operational data workspaces"
  ```

### Task 4: Migrate sensitive workflows without weakening safety

**Files:**
- Modify: `src/features/config/routes/ConfigPage.tsx`
- Modify: `src/features/config/components/ConfigDiffDialog.tsx` only for visual hierarchy/focus treatment.
- Modify: `src/features/oauth/routes/OAuthPage.tsx`
- Modify: `src/features/plugins/routes/PluginsPage.tsx`
- Modify: `src/features/plugins/routes/PluginStorePage.tsx`
- Modify: related shared form/dialog primitives only when required for consistency.
- Test: existing config, OAuth, and plugin page/resource-safety tests.
- Modify: `src/locales/*.json` for translated safety/workflow copy.

**Interfaces:**
- Consumes Task 1 primitives and the route-family visual language.
- Produces sensitive workflow layouts with explicit state, recovery, one primary action, and unchanged safety contracts.

- [ ] **Step 1: Add failing safety/hierarchy assertions**
  - Configuration: editor/review regions exist and save still opens the redacted diff confirmation.
  - OAuth: provider/start/cancel/reset controls remain reachable for active and terminal states; callback and errors retain live/alert semantics.
  - Plugins: executable-code warning remains adjacent to install; invalid IDs remain disabled; install confirmation remains required.

- [ ] **Step 2: Run focused tests to verify failure**
  - Run: `vp test test/features/config/config-page.test.tsx test/features/config/config-diff-dialog.test.tsx test/features/oauth/oauth-page.test.tsx test/features/oauth/state-machine.test.ts test/features/plugins/plugin-pages.test.tsx test/features/plugins/plugin-resource-safety.test.tsx`
  - Expected: FAIL only on new hierarchy assertions.

- [ ] **Step 3: Implement sensitive workflow layouts**
  - Use workspace headers and explicit state regions.
  - Preserve configuration redacted diff confirmation as a mandatory write gate.
  - Keep OAuth state machine and callback validation unchanged.
  - Keep plugin ID parsing, warning copy, confirmation, and restart/error state unchanged.
  - Do not render credential contents or add unverified backend claims.

- [ ] **Step 4: Run focused safety tests**
  - Run the command from Step 2.
  - Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add src/features/config src/features/oauth src/features/plugins src/components/ui src/locales test/features/config test/features/oauth test/features/plugins
  git commit -m "feat(ui): clarify sensitive workspaces"
  ```

### Task 5: Responsive, motion, localization, and visual finish pass

**Files:**
- Modify: shared workspace/shell CSS and primitives as needed.
- Modify: any route files that fail the shared responsive composition.
- Test: shell/workspace and affected route tests.
- Create/update: `.impeccable/review/` captures or bounded visual review artifacts if used.

**Interfaces:**
- Consumes all previous route-family compositions.
- Produces the final responsive and motion contract: desktop persistent rail, tablet collapsed rail, mobile sheet/single-column workspace, reduced-motion alternative.

- [ ] **Step 1: Add/adjust tests for responsive and reduced-motion hooks**
  - Assert 44px hit-area classes on shell/action controls.
  - Assert tables/log viewers use bounded overflow containers.
  - Assert reduced-motion selectors remove transform/entrance animation but retain state classes.
  - Assert all new user-facing copy has keys in all four locale files.

- [ ] **Step 2: Run focused tests to verify failures**
  - Run: `vp test test/components/workspace test/components/shell test/lib/i18n.test.ts`
  - Expected: FAIL only where final responsive/motion assertions are not yet satisfied.

- [ ] **Step 3: Implement the final bounded pass**
  - Fix desktop/tablet/mobile composition without changing route behavior.
  - Keep motion limited to approved grammar; remove blanket choreography.
  - Ensure reduced-motion keeps focus, selected, and status feedback visible.
  - Verify translated labels do not break navigation or action groups.

- [ ] **Step 4: Run one bounded visual review**
  - Capture representative authenticated/demo pages at `1440x900` and `390x844` using the available browser tooling.
  - Inspect shell, dashboard, one data route, and one sensitive workflow.
  - Batch-fix observed material issues once; do not start an open-ended polish loop.

- [ ] **Step 5: Run the full verification matrix**
  - `vp test`
  - `vp check`
  - `vp build`
  - `vp run build:management`
  - `vp run build:demo`
  - `vp run smoke:management`
  - `vp run check:demo`
  - `vp run check:sensitive`
  - `vp run check:licenses`
  - `/home/tretrauit/.agents/skills/impeccable/scripts/impeccable detect --json <changed UI targets>`
  - Expected: tests/builds/scans pass; `vp check` has no new errors; detector is clean.

- [ ] **Step 6: Commit final responsive/verification changes**
  ```bash
  git add src test .impeccable/review
  git commit -m "feat(ui): finish command center redesign"
  ```

### Task 6: Whole-branch review and integration decision

**Files:**
- Review all changes from Tasks 1–5; no planned production edits unless review finds a concrete defect.

- [ ] **Step 1: Review the complete diff against the approved spec**
  - Verify every route family, safety contract, theme, build entry, localization, responsive rule, and motion rule is represented.

- [ ] **Step 2: Run final tests and artifact scans after review fixes**
  - Repeat the full verification matrix from Task 5 Step 5.

- [ ] **Step 3: Present integration options**
  - If all gates pass, present the normal finishing workflow: merge locally, push/create PR, or keep branch as-is.
  - Do not push or deploy without the user’s explicit integration choice.
