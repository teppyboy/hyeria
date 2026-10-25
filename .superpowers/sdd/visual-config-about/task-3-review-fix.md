# Task 3 visual editor review fixes

## Scope

Addressed two review findings in the safe visual configuration editor without changing ConfigPage integration, routes, About, APIs, or pushing:

- `applySafeConfigEdits` now rejects edits whose existing nested ancestor is opaque/non-mapping instead of replacing that value with a mapping. This preserves unsupported original values such as `routing: opaque`, `routing.retry: opaque`, and `plugins.configs.<plugin>: opaque`.
- Setting controls now expose their translated description through `aria-describedby`; validation errors are appended to that association when present. Boolean, text, number, and select controls all use the same accessible association.

## Changed files

- `src/features/config/editor/patch.ts`
- `src/features/config/editor/FieldRenderer.tsx`
- `src/features/config/editor/SettingRow.tsx`
- `test/features/config/config-editor-patch.test.ts`

## Validation

- `pnpm exec vp test test/features/config/config-editor-patch.test.ts test/features/config/config-visual-editor.test.tsx test/features/config/visual-config-form.test.tsx test/features/config/config-page.test.tsx --run` — passed, 4 files / 30 tests.
- `pnpm exec vp check` — passed with existing repository warnings only; no errors.
- `git diff --check` — passed.

## Risks / integration notes

- ConfigPage integration remains intentionally deferred for this task.
- The editor rejects edits below opaque ancestors; users can still use Advanced YAML for those unsupported shapes.

# Task 3 P1 follow-up — plugin validation feedback

## Scope

Threaded the visual editor’s stored validation values and errors through `PluginConfigEditor` so each existing plugin `SettingRow` renders the same error feedback and `aria-describedby` association as top-level settings. Added a regression using an opaque plugin configuration ancestor; the rejected plugin edit now renders localized validation text and associates it with the plugin control.

## Changed files

- `src/features/config/editor/ConfigVisualEditor.tsx`
- `src/features/config/editor/PluginConfigEditor.tsx`
- `test/features/config/config-visual-editor.test.tsx`

## Validation

- `pnpm exec vp test test/features/config --run` — passed, 7 files / 66 tests.
- `pnpm exec vp check` — passed with 7 existing repository warnings and no errors.
- `git diff --check` — passed.

## Risks / integration notes

- ConfigPage integration remains intentionally deferred for this task.
