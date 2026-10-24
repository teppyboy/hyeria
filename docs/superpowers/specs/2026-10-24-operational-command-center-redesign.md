# Hyeria Operational Command Center Redesign

## Status

Approved design direction; implementation not started.

## Product and surface

Hyeria is an independent React management client for self-hosted CLI Proxy API v8 instances. This redesign covers the entire web application surface across the static, management, and isolated demo builds. The visitor mode is Operate: self-hosting operators need to understand system state and carry out management work quickly and safely.

## Goals

- Make the first viewport answer: what session am I in, what is the server state, and where needs attention?
- Give every route a purpose-built workspace hierarchy rather than a generic card grid.
- Establish one coherent black-first operations language across shell, dashboard, forms, tables, dialogs, and workflow pages.
- Preserve all current route behavior, backend contracts, localization, build isolation, credential boundaries, and demo constraints.
- Make state, safety, and recovery visible without inventing backend capabilities or claims.

## Non-goals

- No new backend endpoints, polling system, metrics, or product claims.
- No endpoint display in the normal shell or dashboard. Connection context is limited to safe states such as connected session, interactive demo, disconnected, or session ended. Any future endpoint detail would be explicit and masked, not part of the first viewport.
- No removal or weakening of the existing redacted configuration diff confirmation before writes.
- No removal of light, white, system, or dark theme choices.
- No new animation library, chart library, or visual asset dependency.
- No credential persistence changes and no demo requests to a real backend.

## Information architecture

The application uses a persistent operations frame:

- **Header:** Hyeria mark, safe connection/demo status, language, theme, About, and disconnect.
- **Sidebar:** icon-first navigation with expandable labels, grouped into Operate, Gateway, Observe, Control, and Analytics. Collapsed desktop state is a narrow rail; hover and keyboard focus temporarily expand it without changing the stored preference. Mobile uses the existing sheet navigation behavior.
- **Workspace header:** every route starts with a consistent title, concise purpose statement, relevant status context, and at most one dominant primary action.
- **Workspace body:** route-specific data and controls use the appropriate table, editor, readiness, or workflow composition.
- **State vocabulary:** loading, empty, error, success, unavailable, disabled, and destructive states use shared visual and accessibility patterns.

## Visual world

The existing user-approved black-first Vercel-inspired world remains binding:

- true-black dark default ground;
- graphite and near-black tonal surfaces;
- quiet hairline dividers;
- near-white foreground text;
- semantic success, warning, destructive, and information colors only where they carry meaning;
- Google Sans/Product Sans/system sans stack for interface text;
- Google Code Sans/Google Sans Mono/system monospace for code, logs, timestamps, counts, and operational values;
- restrained 8px control and panel rounding;
- no gradients, glass decoration, fake charts, ornamental dashboard noise, or generic icon-card walls;
- light, white, system, and dark themes remain semantic variants of the same system.

## Dashboard composition

The dashboard is the reference implementation for the system:

1. **Workspace header:** Dashboard title, concise operational description, and safe connection/demo context.
2. **Server facts strip:** version, build date, and plugin capability. Static facts are visually distinct from actionable readiness states.
3. **Readiness overview:** credential totals for available, disabled, unavailable, and runtime-only entries. State colors indicate meaning, not decoration.
4. **Model channels:** a full-width operational list with channel names, availability state, and model information.

The dashboard must not imply durable analytics or complete request coverage. Existing synthetic demo values remain clearly demo behavior.

## Route families

Implementation is partitioned into explicit families:

### Shell

App shell, header, sidebar, mobile navigation, global status, theme/language controls, notices, dialogs, and shared motion.

### Overview

Dashboard, system, analytics, and quota. These prioritize status interpretation, comparison, and safe next actions. Analytics remains framed as a live snapshot, not durable history.

### Data management

Providers, auth files, and logs. These prioritize aligned tables, filters, metadata, action grouping, and bounded horizontal scrolling where required.

### Sensitive workflows

Configuration, OAuth, plugins, and plugin store. These prioritize step/state clarity, recovery, inline safety guidance, and destructive-action separation.

### Shared primitives

Workspace headers, status cells, readiness rows, tables, data states, action groups, form fields, dialogs, notices, and notification patterns.

## Route treatments

- **Providers:** provider groups as readiness-oriented data with counts and status.
- **Auth files:** metadata table with safe upload/enable/download actions grouped separately from destructive deletion.
- **OAuth:** state-machine workspace showing provider, current step, callback completion, cancellation, expiry, and recovery.
- **Quota:** selected credential/action area with cooldown state and confirmation where required.
- **Logs:** filter controls separated from the viewer; error/download actions remain adjacent and discoverable.
- **Configuration:** editor/review split with inline validation and save state. The existing redacted diff confirmation remains mandatory before any write.
- **Plugins:** installed plugins and store/install actions are separate regions. The executable-code warning remains near installation.
- **System:** version comparison and browser-session controls are separate operational sections.
- **Analytics:** live usage snapshot framing with honest limitations.
- **Unavailable, empty, loading, and error routes:** consistent states with a clear recovery or next action when one exists.

## Action hierarchy

Each workspace has at most one dominant primary action. Secondary actions stay grouped nearby. Destructive actions are separated spatially and visually and require the existing confirmation contracts. Read-only routes do not receive an invented primary action; they may offer a genuine next step such as opening configuration or refreshing data.

## Motion grammar

Motion explains state, hierarchy, or continuity:

- sidebar width and label reveal use one confident ease-out;
- active navigation icons and colors transition briefly;
- workspace content enters with a short opacity/translate transition, without blanket card-by-card choreography;
- status rows may briefly highlight when a rendered query result changes during the current mounted session;
- no new polling is introduced solely to animate changes;
- button press, save success, delete confirmation, notifications, dialogs, and sheets provide immediate feedback;
- reduced-motion users receive no spatial entrance, stagger, or transform choreography, while focus, color, selected, and status changes remain visible.

All motion uses CSS and existing primitives, remains interruptible, and avoids animating layout-driving properties where transforms or opacity communicate the same relationship.

## Responsive and accessibility rules

- Desktop retains the persistent sidebar and workspace frame.
- Narrow desktop/tablet uses the collapsible icon rail and hover/focus temporary expansion.
- Mobile uses the existing sheet navigation and single-column workspaces.
- Tables scroll within bounded regions instead of forcing page-wide horizontal overflow.
- Interactive hit areas remain at least 44px.
- Every route retains semantic headings, landmarks, translated accessible labels, visible keyboard focus, and status announcements for meaningful async outcomes.
- No endpoint, management key, credential contents, or sensitive backend metadata is rendered in new status surfaces.

## Build and validation constraints

The implementation stays within the current React, Vite+, Tailwind, Radix, Zustand, TanStack Query, and Lucide stack. Static, management, and demo entries remain separate. Demo behavior remains in-memory, synthetic, credential-free, backend-free, and reset-on-reload.

Validation must include:

- focused tests for shared primitives, route hierarchy, status states, safety confirmations, and demo isolation;
- full unit test suite;
- `vp check` with no new errors;
- static, management, and demo builds;
- management smoke, demo artifact, sensitive-output, and license scans;
- detector scan over changed UI targets;
- one bounded desktop/mobile screenshot review, followed by at most one batched correction round;
- keyboard and reduced-motion checks for the shell and sensitive workflows.

## Implementation order

1. Shared tokens, workspace header, state vocabulary, action groups, and shell architecture.
2. Dashboard reference composition.
3. Shared tables, readiness rows, forms, and data-state primitives.
4. Sensitive workflows: configuration, auth files, OAuth, plugins.
5. Overview and data-management routes.
6. Responsive, motion, localization, and accessibility pass.
7. Bounded visual review and full verification.

## Risks and mitigations

- **Scope drift:** route-family ownership and the implementation order keep the redesign coherent without rewriting backend behavior.
- **Status overstatement:** connection/server/readiness roles are explicitly separated; no new metrics or polling are allowed.
- **Safety regression:** configuration diff confirmation, destructive confirmations, credential boundaries, and demo isolation are explicit acceptance criteria.
- **Motion overload:** one motion grammar, current-session-only status highlights, and reduced-motion alternatives constrain animation debt.
- **Theme drift:** all new surfaces must consume semantic tokens and preserve all existing theme choices.
