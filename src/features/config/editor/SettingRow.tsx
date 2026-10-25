import { Label } from "@/components/ui/label";
import { translate } from "@/lib/i18n";
import { usePreferencesStore } from "@/stores/preferences";
import type { ConfigFieldDefinition, JsonValue } from "./types";
import { FieldRenderer } from "./FieldRenderer";

interface SettingRowProps {
  readonly field: ConfigFieldDefinition;
  readonly value: string | number | boolean | undefined;
  readonly onChange: (value: JsonValue | undefined) => void;
  readonly error?: string;
  readonly suffix?: string;
}

export function SettingRow({ field, value, onChange, error, suffix }: SettingRowProps) {
  const language = usePreferencesStore((state) => state.language);
  const t = (key: string) => translate(language, key);
  const id = `config-field-${field.path.join("-")}${suffix ? `-${suffix}` : ""}`;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  return (
    <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,20rem)] sm:items-center">
      <div className="space-y-1">
        <Label htmlFor={id}>{t(field.labelKey)}</Label>
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {t(field.descriptionKey)}
        </p>
        {value === undefined && (
          <p className="text-xs text-muted-foreground">{t("config.field.unset")}</p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <FieldRenderer field={field} id={id} value={value} onChange={onChange} />
    </div>
  );
}
