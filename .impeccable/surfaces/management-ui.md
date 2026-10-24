# Surface brief: shared Hyeria application UI

## Scope and mode

Shared web application UI used by the static, management, and isolated demo builds. Mode: Operate.

## Audience, job, action, proof, and constraints

Self-hosting operators use Hyeria in a browser to understand CLI Proxy API v8 state and manage their own instance. They inspect status and data, then carry out management actions. The repository's routes, schemas, and real API responses are the source of product truth; demo-only data remains synthetic and isolated. Preserve all existing features, build entry points, authentication and credential boundaries, responsive behavior, localization, accessibility, and light/white/system theme choices.

## Direction contract

**THESIS:** A calm, direct operations surface: black is the dark default, while familiar application structure keeps every task legible and findable. Refuse ornamental dashboards and decoration that competes with live state.

**OWN-WORLD:** Pure black page ground, near-black surfaces, quiet hairline dividers, near-white text, and semantic status colors only for status. Google Sans is the general type target; Google Code Sans is for code, logs, and measured values. Use the existing platform navigation and controls, with restrained corners and consistent spacing.

**STORY:** Operators can scan where they are, understand the current state, and reach the relevant action without learning a novel navigation metaphor. Each build retains its current backend or synthetic-demo behavior.

**FIRST VIEWPORT:** Retain the compact top header and familiar left navigation on desktop, with the current mobile navigation on narrow screens. Start the content with its existing route title and task-specific data, in an aligned content column. Keep controls adjacent to the data they change; use tokens for surfaces, borders, and focus states.

**FORM:** The user's pinned pure-black Vercel-inspired operations direction, expressed through shared tokens in the existing React shell. User confirmation overrides the seeded candidate. Seed key: `9ea9b942` (assigned direction was not adopted because the user pinned a different world).

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved decisions

Google font files are not in the repository; preserve the requested family names and safe fallbacks unless legally redistributable files are supplied. No new raster assets are planned.
