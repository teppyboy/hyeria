import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ActionGroup } from "@/components/workspace/ActionGroup";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import { WorkspaceState } from "@/components/workspace/WorkspaceState";
import { ConfigDiffDialog } from "@/features/config/components/ConfigDiffDialog";
import { VisualConfigForm } from "@/features/config/components/VisualConfigForm";
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
    // A new save attempt supersedes any earlier write failure shown in the alert.
    save.reset();
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
    <section className="mx-auto grid max-w-5xl gap-6">
      <WorkspaceHeader
        title={t("config.title")}
        description={t("config.description")}
        status={<p className="text-sm text-muted-foreground">{t("config.safety")}</p>}
      />
      {yaml.isPending && (
        <WorkspaceState
          kind="loading"
          title={t("config.loading")}
          description={<Skeleton className="mt-3 h-64 w-full" />}
        />
      )}
      {yaml.isError && <WorkspaceState kind="error" title={t("config.loadError")} />}
      {yaml.isSuccess && (
        <>
          <section aria-labelledby="config-editor" className="grid gap-3">
            <h2 id="config-editor" className="text-base font-medium">
              config.yaml
            </h2>
            <Card>
              <CardHeader>
                <CardDescription>{t("config.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <VisualConfigForm
                  text={text}
                  onChange={(value) => {
                    setDraft(value);
                    setSaved(false);
                  }}
                />
                <div id="config-raw-yaml">
                  <YamlEditor
                    value={text}
                    onChange={(value) => {
                      setDraft(value);
                      setSaved(false);
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </section>
          <section aria-labelledby="config-review" className="grid gap-3">
            <h2 id="config-review" className="text-base font-medium">
              {t("config.review")}
            </h2>
            <Card>
              <CardContent className="space-y-3 pt-6">
                {alertMessage && <p role="alert">{alertMessage}</p>}
                {saved && <p role="status">{t("config.saved")}</p>}
                <div data-slot="workspace-actions" className="flex justify-end">
                  <ActionGroup>
                    <Button onClick={handleSave} disabled={save.isPending}>
                      {t("config.save")}
                    </Button>
                  </ActionGroup>
                </div>
              </CardContent>
            </Card>
          </section>
        </>
      )}
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
