import { useMemo } from "react";
import { visualSafeSectionSchema } from "@/features/config/schemas";
import { parseAndValidateYaml } from "@/lib/config/yaml";
import { translate } from "@/lib/i18n";
import { usePreferencesStore } from "@/stores/preferences";

interface VisualConfigFormProps {
  text: string;
}

/**
 * Read-only summary of the non-secret sections present in the draft. Only section names render,
 * never values, so no secret can appear here; editing stays in the raw YAML.
 */
export function VisualConfigForm({ text }: VisualConfigFormProps) {
  const language = usePreferencesStore((state) => state.language);
  const t = (key: string) => translate(language, key);
  const sections = useMemo(() => {
    const parsed = parseAndValidateYaml(text);
    if (!parsed.ok) return [];
    return visualSafeSectionSchema.options.filter((section) =>
      Object.hasOwn(parsed.value, section),
    );
  }, [text]);
  return (
    <div className="space-y-2 text-sm">
      <p>{t("config.visualUnavailable")}</p>
      <ul className="list-disc pl-5">
        {sections.map((section) => (
          <li key={section}>{section}</li>
        ))}
      </ul>
      <a
        className="inline-flex min-h-11 items-center underline"
        href="#config-raw-yaml"
        onClick={(event) => {
          // Keeps the link an in-page jump; a hash navigation would change the router location.
          event.preventDefault();
          document.getElementById("config-raw-yaml")?.scrollIntoView();
        }}
      >
        {t("config.visualRawLink")}
      </a>
    </div>
  );
}
