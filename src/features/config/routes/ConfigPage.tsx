import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { YamlEditor } from "@/features/config/components/YamlEditor";
import { useConfigYamlQuery, useSaveConfigYamlMutation } from "@/features/config/queries";
import { parseAndValidateYaml } from "@/lib/config/yaml";

export function ConfigPage() {
  const yaml = useConfigYamlQuery();
  const save = useSaveConfigYamlMutation();
  const [draft, setDraft] = useState<string | undefined>(undefined);
  const [validationError, setValidationError] = useState<string | undefined>(undefined);
  const [saved, setSaved] = useState(false);

  // The draft starts as the loaded text and is only replaced by user edits.
  const text = draft ?? yaml.data ?? "";

  function handleSave() {
    const result = parseAndValidateYaml(text);
    if (!result.ok) {
      setSaved(false);
      setValidationError(result.message);
      return;
    }
    setValidationError(undefined);
    setSaved(false);
    save.mutate(text, { onSuccess: () => setSaved(true) });
  }

  const saveError = save.isError ? "Config could not be saved." : undefined;
  const alertMessage = validationError ?? saveError;

  return (
    <section className="mx-auto grid max-w-5xl gap-4">
      <h1 className="text-2xl font-semibold">Config</h1>
      <Card>
        <CardHeader>
          <CardTitle>config.yaml</CardTitle>
          <CardDescription>Edit the raw YAML; it is validated before saving.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {yaml.isPending && (
            <div className="space-y-2">
              <p className="text-muted-foreground">Loading config…</p>
              <Skeleton className="h-64 w-full" />
            </div>
          )}
          {yaml.isError && <p role="alert">Config could not be loaded.</p>}
          {yaml.isSuccess && (
            <>
              <YamlEditor value={text} onChange={setDraft} />
              {alertMessage && <p role="alert">{alertMessage}</p>}
              {saved && <p role="status">Config saved.</p>}
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={save.isPending}>
                  Save
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
