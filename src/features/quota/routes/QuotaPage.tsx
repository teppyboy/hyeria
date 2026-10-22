import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePreferencesStore } from "@/stores/preferences";
import { useUiStore } from "@/stores/ui";
import { translate } from "@/lib/i18n";
import { useQuotaCredentialsQuery, useResetCooldownMutation } from "../queries";

export function QuotaPage() {
  const language = usePreferencesStore((state) => state.language);
  const t = (key: string) => translate(language, key);
  const credentials = useQuotaCredentialsQuery();
  const reset = useResetCooldownMutation();
  const resetCooldown = async (authIndex: string) => {
    const accepted = await useUiStore.getState().requestConfirm({
      title: t("quota.resetTitle"),
      description: t("quota.resetDescription"),
      confirmLabel: t("quota.reset"),
    });
    if (!accepted) return;
    reset.mutate(authIndex, {
      onSuccess: () => useUiStore.getState().notify(t("quota.resetSuccess")),
      onError: () => useUiStore.getState().notify(t("quota.resetError"), "error"),
    });
  };
  return (
    <section className="mx-auto grid max-w-5xl gap-4">
      <h1 className="text-2xl font-semibold">{t("nav.quota")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t("quota.cooldown")}</CardTitle>
          <CardDescription>{t("quota.cooldownDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {credentials.isPending && <Skeleton className="h-12 w-full" />}
          {credentials.isError && <p role="alert">{t("quota.credentialsError")}</p>}
          {credentials.isSuccess && credentials.data.length === 0 && (
            <p className="text-muted-foreground">{t("quota.empty")}</p>
          )}
          {credentials.isSuccess &&
            credentials.data.map((file) => (
              <div
                key={file.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
              >
                <span>
                  {file.name} ({file.provider})
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={reset.isPending}
                  onClick={() => resetCooldown(file.authIndex)}
                >
                  {t("quota.reset")}
                </Button>
              </div>
            ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("quota.pluginTitle")}</CardTitle>
          <CardDescription>{t("quota.pluginUnavailable")}</CardDescription>
        </CardHeader>
      </Card>
    </section>
  );
}
