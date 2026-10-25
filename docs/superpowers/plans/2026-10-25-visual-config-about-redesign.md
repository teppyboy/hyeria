# Visual Configuration and About Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe source-preserving visual configuration editor for the evidenced CLIProxyAPI v8 subset and redesign About into a readable structured dialog without changing API, credential, or build contracts.

**Architecture:** Keep raw YAML authoritative. A verified field registry maps safe paths to typed controls; a patch module applies edits to the parsed original document and returns a candidate draft, preserving unknown keys and sensitive sections. ConfigPage continues the existing validate → redacted diff → confirm → exact YAML write flow. About becomes a structured localized dialog. 

**Tech Stack:** React 19, TypeScript, Zod, YAML, Tailwind CSS 4, Radix UI, Zustand, Vite+.

**Spec:** `docs/superpowers/specs/2026-10-25-visual-config-about-redesign.md`

## Global Constraints

- Do not add backend endpoints, polling, dependencies, or a second save protocol.
- Do not display or edit `access`, `oauth`, API keys, tokens, credentials, or userinfo URLs in visual fields.
- Preserve unknown keys, unsupported sections, and raw fallback access.
- Preserve parse/validate, redacted diff, confirmation, and exact YAML write behavior.
- Add all user-visible strings to `en`, `ru`, `zh-CN`, and `zh-TW` catalogs.
- Maintain 44px controls, visible focus, reduced-motion alternatives, demo isolation, and all three build entries.

## Ownership map

- **Config contract/registry:** `src/features/config/editor/types.ts`, `registry.ts`, tests.
- **Source-preserving patching:** `src/features/config/editor/patch.ts`, tests.
- **Visual editor UI:** `src/features/config/editor/*.tsx`, `VisualConfigForm.tsx`, route tests.
- **About:** `src/components/feedback/LegalNotice.tsx`, locale keys, feedback tests.
- **Integration/validation:** `ConfigPage.tsx`, config tests, builds/scans/screenshots.

### Task 1: Define verified visual field registry

**Files:**
- Create: `src/features/config/editor/types.ts`
- Create: `src/features/config/editor/registry.ts`
- Test: `test/features/config/config-editor-registry.test.ts`

**Interfaces:**
- `ConfigFieldDefinition` includes `path: readonly string[]`, `kind: "boolean" | "text" | "number" | "select"`, `labelKey`, `descriptionKey`, optional `options`, `secret: false`, and numeric constraints.
- `SAFE_CONFIG_FIELDS: readonly ConfigFieldDefinition[]` contains only the eight evidenced safe field shapes from the spec.
- `SAFE_CONFIG_SECTIONS` contains section navigation metadata for management, requests, routing, observability, plugins, and advanced YAML.

- [ ] Write failing tests for registry paths, secret exclusion, verified option metadata, and no duplicate paths.
- [ ] Run focused test and confirm failure.
- [ ] Implement module-level registry with no API calls and no invented defaults.
- [ ] Run focused test and confirm pass.
- [ ] Commit `feat(config): define safe visual field registry`.

### Task 2: Implement source-preserving document patching

**Files:**
- Create: `src/features/config/editor/patch.ts`
- Test: `test/features/config/config-editor-patch.test.ts`
- Modify only if needed: existing YAML helpers.

**Interfaces:**
- `readSafeConfigView(document: Record<string, unknown>): SafeConfigView` reads only registered paths and returns unset for absent values.
- `applySafeConfigEdits(document: Record<string, unknown>, edits: readonly ConfigEdit[]): Record<string, unknown>` clones/patches the original document, never reconstructing from the safe view.
- `ConfigEdit` is `{ path: readonly string[]; value: JsonValue | undefined }`; undefined means remove only the registered field, never the root.
- `serializeConfigDocument(document): string` uses the existing YAML serializer conventions and rejects invalid values before returning.

- [ ] Add failing tests for nested boolean/number/text/select edits, unknown-key preservation, secret-section preservation, absent fields, and removal.
- [ ] Run focused test and confirm failure.
- [ ] Implement minimal path-aware clone/patch using existing validation utilities; do not add API writes.
- [ ] Run focused tests plus existing config API/YAML tests.
- [ ] Commit `feat(config): patch visual drafts safely`.

### Task 3: Build visual editor controls and section navigation

**Files:**
- Create: `src/features/config/editor/ConfigVisualEditor.tsx`
- Create: `src/features/config/editor/SettingRow.tsx`
- Create: `src/features/config/editor/FieldRenderer.tsx`
- Create: `src/features/config/editor/PluginConfigEditor.tsx`
- Create: `src/features/config/editor/SecretBoundary.tsx`
- Modify: `src/features/config/components/VisualConfigForm.tsx`
- Test: `test/features/config/config-visual-editor.test.tsx`

**Interfaces:**
- `ConfigVisualEditor({ text, onChange }: { text: string; onChange: (yaml: string) => void })` is controlled by the draft text and emits patched YAML only for registered safe fields.
- `SettingRow` renders translated label/description, unset state, control, and validation feedback.
- `FieldRenderer` maps registry kind to labeled 44px control; no secret field renderer exists.
- `SecretBoundary` explains that sensitive/unsupported settings remain in Advanced YAML without naming or displaying secret values.

- [ ] Add failing tests for section navigation, safe fields, unset values, plugin rows, no secret values/sections, and onChange preserving unknown keys.
- [ ] Run focused test and confirm failure.
- [ ] Implement controlled editor using Task 1 registry and Task 2 patch functions; keep Advanced YAML link prominent.
- [ ] Run focused editor/config page tests, including redacted diff flow.
- [ ] Commit `feat(config): add safe visual editor`.

### Task 4: Redesign About / Legal dialog

**Files:**
- Modify: `src/components/feedback/LegalNotice.tsx`
- Modify: `src/locales/en.json`, `ru.json`, `zh-CN.json`, `zh-TW.json`
- Test: `test/components/feedback/feedback.test.tsx`

**Interfaces:**
- Keep `LegalNotice({ open, onOpenChange }: Props)` and `SOURCE_URL` unchanged.
- Render labeled sections for identity, license/source, network use, build, warranty, and branding.
- Use labeled links instead of raw URL-heavy paragraphs; preserve factual legal copy.

- [ ] Add failing structure/localization tests for section headings, source link, close label, responsive scroll container, and absence of ungrouped paragraph wall.
- [ ] Run focused feedback tests and confirm failure.
- [ ] Implement structured dialog with existing Radix primitives, 44px controls, and translated section keys.
- [ ] Run feedback/i18n tests.
- [ ] Commit `feat(ui): structure About dialog`.

### Task 5: Integrate config route and verify end-to-end safety

**Files:**
- Modify: `src/features/config/routes/ConfigPage.tsx`
- Modify: `test/features/config/config-page.test.tsx`
- Modify: `test/features/config/config-diff-dialog.test.tsx`
- Modify locales only if integration copy is missing.

- [ ] Add failing integration tests proving visual edits feed the draft, unknown keys survive, invalid YAML remains blocked, and save still opens redacted confirmation before exact YAML write.
- [ ] Run focused config tests and confirm failure.
- [ ] Replace the read-only summary with `ConfigVisualEditor` while retaining raw YAML and Advanced fallback.
- [ ] Run all config API/YAML/page/diff/editor tests.
- [ ] Commit `feat(config): integrate visual editor workspace`.

### Task 6: Final responsive and release validation

**Files:**
- Modify only concrete issues found in validation.
- Create: `.superpowers/sdd/visual-config-about/task-6-report.md`

- [ ] Run full `vp test`, `vp check`, TypeScript, and detector over changed UI targets.
- [ ] Run static, management, and demo builds plus smoke/demo/sensitive/license scans.
- [ ] Capture and inspect About and Configuration at `1440x900` and `390x844`, including reduced-motion mode.
- [ ] Fix concrete issues in one batch; rerun affected tests/builds and capture one final confirmation batch.
- [ ] Commit `feat(config): finish visual editor and About redesign`.
- [ ] Run final read-only whole-branch review against the spec and plan.
