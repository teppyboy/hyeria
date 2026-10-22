import { translate } from "@/lib/i18n";
import { usePreferencesStore } from "@/stores/preferences";

interface YamlEditorProps {
  value: string;
  onChange: (value: string) => void;
}

/** Plain textarea for raw YAML; no formatting or normalization, so the draft stays verbatim. */
export function YamlEditor({ value, onChange }: YamlEditorProps) {
  const language = usePreferencesStore((state) => state.language);
  return (
    <textarea
      aria-label={translate(language, "config.editorLabel")}
      className="min-h-96 w-full rounded-md border bg-background p-3 font-mono text-sm"
      spellCheck={false}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
