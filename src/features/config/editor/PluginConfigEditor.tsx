import { translate } from "@/lib/i18n";
import { usePreferencesStore } from "@/stores/preferences";
import { SAFE_CONFIG_FIELDS } from "./registry";
import type { ConfigEdit, JsonValue, SafeConfigView } from "./types";
import { SettingRow } from "./SettingRow";

interface PluginConfigEditorProps {
  readonly document: Record<string, unknown>;
  readonly values: SafeConfigView;
  readonly errors: Readonly<Record<string, string>>;
  readonly onEdit: (edit: ConfigEdit) => void;
}

export function PluginConfigEditor({ document, values, errors, onEdit }: PluginConfigEditorProps) {
  const language = usePreferencesStore((state) => state.language);
  const t = (key: string) => translate(language, key);
  const configs = document.plugins;
  const pluginConfigs =
    typeof configs === "object" && configs !== null && !Array.isArray(configs)
      ? (configs as Record<string, unknown>).configs
      : undefined;
  const plugins =
    typeof pluginConfigs === "object" && pluginConfigs !== null && !Array.isArray(pluginConfigs)
      ? Object.keys(pluginConfigs as Record<string, unknown>)
      : [];
  const pluginFields = SAFE_CONFIG_FIELDS.filter((field) => field.path.includes("<plugin>"));

  if (plugins.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("config.plugins.empty")}</p>;
  }

  return (
    <div className="space-y-4">
      {plugins.map((plugin) => (
        <section
          key={plugin}
          className="space-y-3 rounded-lg border p-4"
          aria-labelledby={`plugin-${plugin}`}
        >
          <h3 id={`plugin-${plugin}`} className="font-medium">
            {plugin}
          </h3>
          {pluginFields.map((field) => {
            const path = field.path.map((part) => (part === "<plugin>" ? plugin : part));
            const key = path.join(".");
            return (
              <SettingRow
                key={key}
                field={field}
                suffix={plugin}
                value={values[key]}
                error={errors[key]}
                onChange={(value: JsonValue | undefined) => onEdit({ path, value })}
              />
            );
          })}
        </section>
      ))}
    </div>
  );
}
