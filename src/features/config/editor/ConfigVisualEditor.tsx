import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { parseAndValidateYaml } from "@/lib/config/yaml";
import { translate } from "@/lib/i18n";
import { usePreferencesStore } from "@/stores/preferences";
import { applySafeConfigEdits, readSafeConfigView, serializeConfigDocument } from "./patch";
import { SAFE_CONFIG_FIELDS, SAFE_CONFIG_SECTIONS } from "./registry";
import { PluginConfigEditor } from "./PluginConfigEditor";
import { SecretBoundary } from "./SecretBoundary";
import { SettingRow } from "./SettingRow";
import type { ConfigEdit, ConfigSectionId, JsonValue } from "./types";

export interface ConfigVisualEditorProps {
  readonly text: string;
  readonly onChange: (yaml: string) => void;
}

/** Controlled editor for the verified safe subset; raw YAML remains the fallback. */
export function ConfigVisualEditor({ text, onChange }: ConfigVisualEditorProps) {
  const language = usePreferencesStore((state) => state.language);
  const t = (key: string) => translate(language, key);
  const [section, setSection] = useState<ConfigSectionId>("management");
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({});
  const parsed = useMemo(() => parseAndValidateYaml(text), [text]);
  const view = useMemo(() => (parsed.ok ? readSafeConfigView(parsed.value) : {}), [parsed]);
  const fields = SAFE_CONFIG_FIELDS.filter(
    (field) => field.path[0] === section && !field.path.includes("<plugin>"),
  );

  function handleEdit(edit: ConfigEdit) {
    if (!parsed.ok) return;
    const key = edit.path.join(".");
    try {
      const document = applySafeConfigEdits(parsed.value, [edit]);
      onChange(serializeConfigDocument(document));
      setErrors((current) => {
        if (!(key in current)) return current;
        const next = { ...current };
        delete next[key];
        return next;
      });
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [key]: error instanceof Error ? t("config.field.invalid") : t("config.field.invalid"),
      }));
    }
  }

  function scrollToRawYaml() {
    document.getElementById("config-raw-yaml")?.scrollIntoView();
  }

  return (
    <div className="space-y-5" data-testid="config-visual-editor">
      <div
        className="flex gap-2 overflow-x-auto border-b pb-2"
        aria-label={t("config.visualSections")}
      >
        {SAFE_CONFIG_SECTIONS.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant={section === item.id ? "secondary" : "ghost"}
            aria-selected={section === item.id}
            role="tab"
            onClick={() => setSection(item.id)}
          >
            {t(item.labelKey)}
          </Button>
        ))}
      </div>

      {!parsed.ok ? (
        <div className="space-y-3" aria-live="polite">
          <p>{t("config.visualInvalidYaml")}</p>
          <Button type="button" variant="outline" onClick={scrollToRawYaml}>
            {t("config.visualRawLink")}
          </Button>
        </div>
      ) : section === "advanced-yaml" ? (
        <div className="space-y-3">
          <p>{t("config.visualAdvancedDescription")}</p>
          <SecretBoundary />
          <Button type="button" variant="outline" onClick={scrollToRawYaml}>
            {t("config.visualRawLink")}
          </Button>
        </div>
      ) : section === "plugins" ? (
        <div className="space-y-4">
          {fields.map((field) => (
            <SettingRow
              key={field.path.join(".")}
              field={field}
              value={view[field.path.join(".")]}
              error={errors[field.path.join(".")]}
              onChange={(value: JsonValue | undefined) => handleEdit({ path: field.path, value })}
            />
          ))}
          <PluginConfigEditor document={parsed.value} onEdit={handleEdit} />
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t(SAFE_CONFIG_SECTIONS.find((item) => item.id === section)?.descriptionKey ?? "")}
          </p>
          {fields.length > 0 ? (
            fields.map((field) => (
              <SettingRow
                key={field.path.join(".")}
                field={field}
                value={view[field.path.join(".")]}
                error={errors[field.path.join(".")]}
                onChange={(value: JsonValue | undefined) => handleEdit({ path: field.path, value })}
              />
            ))
          ) : (
            <SecretBoundary />
          )}
        </div>
      )}

      <div className="border-t pt-4">
        <Button type="button" variant="link" className="px-0" onClick={scrollToRawYaml}>
          {t("config.visualRawLink")}
        </Button>
      </div>
    </div>
  );
}
