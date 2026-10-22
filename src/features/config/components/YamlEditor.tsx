interface YamlEditorProps {
  value: string;
  onChange: (value: string) => void;
}

/** Plain textarea for raw YAML; no formatting or normalization, so the draft stays verbatim. */
export function YamlEditor({ value, onChange }: YamlEditorProps) {
  return (
    <textarea
      aria-label="Config YAML"
      className="min-h-96 w-full rounded-md border bg-background p-3 font-mono text-sm"
      spellCheck={false}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
