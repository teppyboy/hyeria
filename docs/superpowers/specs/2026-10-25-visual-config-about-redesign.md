# Hyeria Visual Configuration and About Redesign

## Status

Approved direction; implementation begins only after the accompanying plan is approved.

## Purpose

Repair the incomplete configuration and About surfaces without changing backend contracts, credential boundaries, or the isolated builds.

## Product truth and constraints

Hyeria manages CLIProxyAPI v8. The existing YAML editor, validation, redacted diff, and exact-text write flow are trusted behavior. The visual editor must be an additive safe subset, not a replacement for Advanced YAML.

The official CLIProxyAPI Management Center is MIT-licensed and provides useful interaction references: modular configuration sections, setting rows, toggles, list editors, visual/source modes, search, and diff-before-save. Its current editor does not provide a single complete machine-readable schema. Hyeria must not copy unverified field coverage or assume all upstream versions have the same shape.

## Goals

- Make About readable, grouped, localized, keyboard-safe, and responsive.
- Replace the current read-only configuration section summary with a useful visual editor for the documented safe subset evidenced by Hyeria fixtures and CLIProxyAPI v8 documentation.
- Preserve unknown settings and raw YAML content.
- Keep Advanced YAML as the fallback for unsupported, new, or sensitive settings.
- Preserve redacted diff confirmation before every write.
- Keep static, management, and demo builds isolated.

## Non-goals

- Do not claim literal exhaustive upstream parity.
- Do not edit or display `access`, `oauth`, API keys, tokens, credentials, or URLs containing userinfo in ordinary visual fields.
- Do not silently delete unknown keys, unsupported sections, comments, or raw YAML content.
- Do not add backend endpoints, polling, new dependencies, or a second save protocol.
- Do not bypass `parseAndValidateYaml`, `buildConfigDiff`, or the existing confirmation dialog.

## Safe visual field subset

The first visual registry may expose only these evidenced fields:

- `management.allow-remote`: boolean toggle.
- `requests.proxy-url`: text field, with secret/userinfo display protections.
- `routing.strategy`: select using only values verified by the pinned v8 contract/fixtures.
- `routing.retry.request-retry`: finite non-negative integer.
- `observability.logs.logging-to-file`: boolean toggle.
- `observability.usage.usage-statistics-enabled`: boolean toggle.
- `plugins.enabled`: boolean toggle.
- `plugins.configs.<plugin>.enabled`: boolean toggle for existing plugin entries.
- `plugins.configs.<plugin>.priority`: finite integer for existing plugin entries.

If a value is absent, the form shows an unset state and does not invent a default. If a field or enum value cannot be verified, it stays in Advanced YAML.

## Architecture

### Source-preserving edit model

The original YAML text remains authoritative. The visual editor parses a draft into a safe view model only for the registered fields. Edits are applied to a parsed document derived from the original draft, preserving all unknown keys and sections. The implementation must not construct a new document from only visible fields.

The visual editor returns a candidate YAML string to `ConfigPage`; the page continues to validate it, compute the existing redacted diff against server text, show the existing confirmation dialog, and write the exact confirmed YAML text. The visual editor never writes directly to the API.

Because the current YAML parser/serializer may not preserve comments byte-for-byte, Advanced YAML remains the authoritative escape hatch. The UI must warn or make clear that visual edits operate on the parsed document and keep unknown keys, but must not promise comment preservation unless proven by tests.

### Editor modules

- `registry.ts`: module-level verified field metadata and section definitions.
- `types.ts`: field metadata, safe view model, edit operation types.
- `patch.ts`: source-preserving YAML/document patch operations; no API calls.
- `ConfigVisualEditor.tsx`: section navigation and orchestration.
- `SettingRow.tsx`: label, description, unset state, control, validation.
- `FieldRenderer.tsx`: typed controls for boolean/text/number/select.
- `PluginConfigEditor.tsx`: existing plugin entry rows only.
- `SecretBoundary.tsx`: explains why sensitive sections remain in Advanced YAML.

### About surface

`LegalNotice` becomes a structured dialog with:

- project identity and independence;
- license and source;
- network-use notice;
- build instructions;
- warranty;
- temporary branding note.

Long legal text remains accurate and localized. URLs use labeled links. The dialog preserves Radix focus management, close labeling, reduced-motion behavior, and responsive scrolling.

## Safety rules

- Visual values never include secret-bearing sections.
- Existing secret-looking values are never copied into ordinary form state for display.
- Every visual save follows: parse → validate → diff/redact → confirm → exact YAML write.
- Unsupported fields remain accessible through Advanced YAML.
- Invalid YAML disables visual editing and keeps the raw editor/error path available.
- Unknown-key preservation is tested with representative fixture data.
- Demo uses the same in-memory transport and must not request credentials or a real backend.

## UX structure

Configuration workspace:

```text
Configuration
├── Safety/status header
├── Section navigation: General, Requests, Routing, Observability, Plugins, Advanced YAML
├── Visual editor: setting rows and plugin list rows
├── Advanced YAML: existing editor and explicit fallback link/section
└── Review & Save: existing redacted diff confirmation
```

About dialog:

```text
About Hyeria
├── Independent project
├── License
├── Source code
├── Network use
├── Build from source
├── Warranty
└── Branding status
```

## Accessibility, localization, and performance

- All new labels, descriptions, field states, and About headings are keys in all four catalogs.
- Controls have labels, descriptions where needed, visible focus, and 44px minimum hit areas.
- Errors and save results retain `role="alert"` / `role="status"` semantics.
- Reduced motion removes spatial/entrance motion but preserves focus, selected, and validation feedback.
- Keep registry data module-level and stable; avoid parsing the full document once per field render.
- Visual editor may be lazy-loaded at the configuration route boundary if it improves bundle cost without complicating the management single-file build.

## Acceptance criteria

- About is readable on desktop/mobile and all copy remains localized.
- Visual editor edits every field in the safe registry and produces a candidate YAML draft.
- Unknown keys and unsupported sections survive visual edits.
- Secret-bearing sections/values are not displayed in visual controls.
- Existing redacted diff confirmation remains mandatory.
- Advanced YAML remains functional for unsupported settings.
- Static, management, and demo builds remain isolated and pass their artifact scans.
- Unit tests cover registry, patching, round trips, unknown-key preservation, secret boundaries, About structure, and save flow.
- Browser captures cover configuration and About at 1440x900 and 390x844.
