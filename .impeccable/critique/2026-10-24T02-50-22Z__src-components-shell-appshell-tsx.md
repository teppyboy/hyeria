---
target: src/components/shell/AppShell.tsx
total_score: 28
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 2
target_identity: "file:/home/tretrauit/workspace/hyeria/src/components/shell/AppShell.tsx"
target_fingerprint: "sha256:ac31f6d0e29d5a8d1f0813bb34309377d00a046d690a7ce7f0348a0e33121159"
target_path: /home/tretrauit/workspace/hyeria/src/components/shell/AppShell.tsx
timestamp: 2026-10-24T02-50-22Z
slug: src-components-shell-appshell-tsx
---

# Shared Hyeria UI critique

## Design Health Score

| #         | Heuristic                       |     Score | Key issue                                                                                                                     |
| --------- | ------------------------------- | --------: | ----------------------------------------------------------------------------------------------------------------------------- |
| 1         | Visibility of System Status     |       3/4 | Loading and error states exist, but the shared shell does not provide persistent connection context.                          |
| 2         | Match System / Real World       |       3/4 | Operations terminology is appropriate; some navigation group labels require product familiarity.                              |
| 3         | User Control and Freedom        |       3/4 | Disconnect confirmation and mobile sheet close are present; route-level recovery varies.                                      |
| 4         | Consistency and Standards       |       3/4 | Shared primitives are consistent, but several routes still use raw controls instead of the shared `Button`/`Input`.           |
| 5         | Error Prevention                |       3/4 | Form validation and destructive confirmation are present; credential persistence remains a high-consequence choice.           |
| 6         | Recognition Rather Than Recall  |       3/4 | Grouped sidebar and active route state help; icon-only header actions rely on tooltips/labels rather than visible text.       |
| 7         | Flexibility and Efficiency      |       2/4 | No evidence of keyboard shortcuts, command navigation, or power-user shortcuts.                                               |
| 8         | Aesthetic and Minimalist Design |       3/4 | The dark token system is restrained, but the login page remains generic and the shell has limited product-specific character. |
| 9         | Error Recovery                  |       3/4 | Error boundaries, inline alerts, and recovery actions exist; recovery copy and next actions are not uniform across routes.    |
| 10        | Help and Documentation          |       2/4 | About/legal access exists, but contextual help for configuration, plugins, OAuth, and logs is sparse.                         |
| **Total** |                                 | **28/40** | **Good; address weak flexibility and contextual help.**                                                                       |

## Design Specificity Verdict

The visual system is coherent and intentional but currently closer to a polished generic admin shell than a strongly authored Hyeria operating surface. The black/near-black tokens, semantic colors, familiar sidebar, and route grouping support the product’s clear-operations goal. The biggest missed opportunity is the product-specific signal: provider health, runtime status, configuration safety, and demo isolation are not expressed in the shell itself. The detector found no findings in the scanned shell/features/routes scope. The screenshots were usable at 1440px and 390px, but the live route was the unauthenticated login surface; authenticated dashboard screenshots were not available without entering credentials.

## Overall Impression

The redesign is calmer and more legible than the incumbent, and it preserves the right application structure. It still reads as “a competent management console” before it reads as Hyeria. The single biggest opportunity is to make operational state and safe actions visibly distinctive without adding dashboard decoration.

## What's Working

- **Clear shell topology:** Header, sidebar groups, mobile sheet, and main landmark establish a predictable working frame.
- **Strong dark foundation:** Pure black background with tonal surfaces and quiet dividers creates the requested Vercel-inspired discipline without relying on gradients or decorative effects.
- **Safety/accessibility foundations:** Skip link, labeled selects, focus-visible styling, reduced-motion handling, destructive confirmation, and demo isolation are all present.

## Priority Issues

- **[P1] Authenticated operational context is missing from the shell.** The header shows the product name and tagline but not the connected endpoint, API version, demo status, or connection health. Operators must infer context from the page. Fix with a compact, non-sensitive connection-status affordance that distinguishes demo, connected, reconnecting, and disconnected states and links to the relevant recovery action. Suggested command: `$impeccable clarify`.

- **[P1] Contextual help is too thin for high-risk routes.** Configuration, OAuth, plugin installation, auth files, and remembered sessions carry meaningful safety consequences, but help is mostly global/legal. Add concise route-level descriptions and recovery guidance beside risky actions, not extra modal onboarding. Suggested command: `$impeccable onboard`.

- **[P2] Login surface is visually generic and uses raw controls.** The captured 1440px and 390px views show a centered white/gray card under the Vite dev server’s default light preference, with no Hyeria-specific operational framing. The route also uses raw `<input>` and `<button>` controls instead of shared primitives. Align it with the shared token/component system while keeping the credential boundary explicit. Suggested command: `$impeccable polish`.

- **[P2] Navigation efficiency is limited for frequent operators.** Sidebar grouping is sensible, but there is no quick route search, command navigation, or keyboard shortcut layer. A lightweight command/search entry would reduce repeated scanning without changing the standard navigation model. Suggested command: `$impeccable layout`.

- **[P3] Motion language is global rather than state-specific.** `#main-content > *` receives the same entrance animation on every route, while the design contract calls for one purposeful authored moment. Limit entrance motion to route transitions or meaningful async state changes and keep action feedback distinct. Suggested command: `$impeccable animate`.

## Persona Red Flags

- **Alex (Power User):** Repeatedly scans the same grouped sidebar and has no fast route search or shortcut path. The header’s icon-only controls are labeled for assistive technology but offer no visible shortcut or compact status context.
- **Jordan (First-Timer):** Encounters terms such as “auth files,” “OAuth,” and “plugin store” without contextual explanation. The login page explains credential persistence, but the rest of the product does not consistently explain what a destructive or backend-affecting action will do.
- **Mina (Safety-conscious self-hosting operator):** Cannot confirm the active endpoint or whether the current screen is demo data from the shared shell. This increases the risk of acting on the wrong instance, especially when moving between demo and connected builds.

## Minor Observations

- The default dark preference is implemented and tested, but the current screenshot capture showed light because the dev server had an existing persisted preference or pre-existing page state; visual verification should explicitly clear storage and capture each theme.
- `@media (prefers-reduced-motion: reduce)` intentionally removes transitions, but the broad global rule also removes all transition timing rather than preserving a minimal state cue.
- Raw colors are intentionally concentrated in `src/styles/tokens.css`; the detector did not flag source components. Keep future additions semantic.
- The live helper was configured and booted successfully, but no browser overlay was available because Chrome DevTools could not connect and the standalone live session had no connected client.

## Questions to Consider

- What is the smallest always-visible connection/status signal that prevents an operator from acting on the wrong instance?
- Could the dashboard’s strongest product-specific concept be a concise operational timeline or health summary rather than another metric card?
- Which two routes deserve inline safety guidance first: configuration, plugins, OAuth, or auth files?
