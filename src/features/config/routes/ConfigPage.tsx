import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfigDiffDialog } from "@/features/config/components/ConfigDiffDialog";
import { YamlEditor } from "@/features/config/components/YamlEditor";
import { useConfigYamlQuery, useSaveConfigYamlMutation } from "@/features/config/queries";
import { ApiError } from "@/lib/api/errors";
import { buildConfigDiff, type ConfigDiff } from "@/lib/config/diff";
import { translate } from "@/lib/i18n";
import { ConfigYamlError, parseAndValidateYaml, type YamlErrorCode } from "@/lib/config/yaml";
import { usePreferencesStore } from "@/stores/preferences";

const YAML_ERROR_KEYS: Record<YamlErrorCode, string> = {
  multiple_documents: "config.error.multiple_documents",
  duplicate_key: "config.error.duplicate_key",
  malformed: "config.error.malformed",
  empty: "config.error.empty",
  not_mapping: "config.error.not_mapping",
};

/** Keys only from the API status and identifier; the server message is never shown. */
function saveErrorKey(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.apiCode === "read_only_field") return "config.saveReadOnly";
    if (error.status === 422) return "config.saveInvalid";
    if (error.status === 400) return "config.saveBadRequest";
  }
  return "config.saveError";
}

export function ConfigPage() {
  const language = usePreferencesStore((state) => state.language);
  const t = (key: string) => translate(language, key);
  const yaml = useConfigYamlQuery();
  const save = useSaveConfigYamlMutation();
  const [draft, setDraft] = useState<string | undefined>(undefined);
  const [validationError, setValidationError] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState<{ text: string; diff: ConfigDiff } | undefined>(undefined);
  const [saved, setSaved] = useState(false);

  // The draft starts as the loaded text and is only replaced by user edits.
  const text = draft ?? yaml.data ?? "";

  function handleSave() {
    const result = parseAndValidateYaml(text);
    if (!result.ok) {
      setSaved(false);
      setValidationError(t(YAML_ERROR_KEYS[result.code]));
      return;
    }
    try {
      // The diff is against the server's text, so the confirmation shows what the write changes.
      const diff = buildConfigDiff(yaml.data ?? "", text);
      setValidationError(undefined);
      setSaved(false);
      setPending({ text, diff });
    } catch (error) {
      setSaved(false);
      setValidationError(
        error instanceof ConfigYamlError ? t(YAML_ERROR_KEYS[error.code]) : t("config.saveError"),
      );
    }
  }

  function confirmSave() {
    if (!pending) return;
    save.mutate(pending.text, {
      onSuccess: () => {
        setPending(undefined);
        setSaved(true);
      },
      onError: () => setPending(undefined),
    });
  }

  const saveError = save.isError ? t(saveErrorKey(save.error)) : undefined;
  const alertMessage = validationError ?? saveError;

  return (
    <section className="mx-auto grid max-w-5xl gap-4">
      <h1 className="text-2xl font-semibold">{t("config.title")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>config.yaml</CardTitle>
          <CardDescription>{t("config.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {yaml.isPending && (
            <div className="space-y-2">
              <p className="text-muted-foreground">{t("config.loading")}</p>
              <Skeleton className="h-64 w-full" />
            </div>
          )}
          {yaml.isError && <p role="alert">{t("config.loadError")}</p>}
          {yaml.isSuccess && (
            <>
              <YamlEditor value={text} onChange={setDraft} />
              {alertMessage && <p role="alert">{alertMessage}</p>}
              {saved && <p role="status">{t("config.saved")}</p>}
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={save.isPending}>
                  {t("config.save")}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      {pending && (
        <ConfigDiffDialog
          diff={pending.diff}
          pending={save.isPending}
          onConfirm={confirmSave}
          onCancel={() => setPending(undefined)}
        />
      )}
    </section>
  );
}
