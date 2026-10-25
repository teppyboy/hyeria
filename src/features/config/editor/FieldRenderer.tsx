import { Input } from "@/components/ui/input";
import { translate } from "@/lib/i18n";
import { usePreferencesStore } from "@/stores/preferences";
import type { ConfigFieldDefinition, JsonValue } from "./types";

interface FieldRendererProps {
  readonly field: ConfigFieldDefinition;
  readonly id: string;
  readonly value: string | number | boolean | undefined;
  readonly onChange: (value: JsonValue | undefined) => void;
}

/** Renders only the scalar control kinds represented by the verified registry. */
export function FieldRenderer({ field, id, value, onChange }: FieldRendererProps) {
  const language = usePreferencesStore((state) => state.language);
  const t = (key: string) => translate(language, key);

  switch (field.kind) {
    case "boolean":
      return (
        <input
          id={id}
          type="checkbox"
          className="size-5 min-h-11 min-w-11 cursor-pointer rounded border-input accent-primary"
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
        />
      );
    case "text":
      return (
        <Input
          id={id}
          type="text"
          value={typeof value === "string" ? value : ""}
          placeholder={t("config.field.unsetValue")}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "number":
      return (
        <Input
          id={id}
          type="number"
          min={field.minimum}
          max={field.maximum}
          step={field.integer ? 1 : "any"}
          value={typeof value === "number" ? String(value) : ""}
          placeholder={t("config.field.unsetValue")}
          onChange={(event) => {
            if (event.target.value === "") {
              onChange(undefined);
              return;
            }
            const number = Number(event.target.value);
            if (Number.isFinite(number)) onChange(number);
          }}
        />
      );
    case "select":
      return (
        <select
          id={id}
          className="min-h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value || undefined)}
        >
          <option value="">{t("config.field.unsetValue")}</option>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </select>
      );
  }
}
