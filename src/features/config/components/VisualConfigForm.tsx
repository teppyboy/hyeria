import { ConfigVisualEditor } from "@/features/config/editor/ConfigVisualEditor";

interface VisualConfigFormProps {
  readonly text: string;
  /** Optional for the existing read-only route until ConfigPage wires the controlled draft. */
  readonly onChange?: (yaml: string) => void;
}

/** Visual safe-subset editor; the raw YAML editor remains the authoritative fallback. */
export function VisualConfigForm({ text, onChange = () => undefined }: VisualConfigFormProps) {
  return <ConfigVisualEditor text={text} onChange={onChange} />;
}
