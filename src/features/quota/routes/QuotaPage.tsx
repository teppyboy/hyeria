import { ActionGroup } from "@/components/workspace/ActionGroup";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import { Button } from "@/components/ui/button";
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
    <section className="mx-auto grid max-w-5xl gap-6">
      <WorkspaceHeader title={t("nav.quota")} description={t("quota.cooldownDescription")} />

      <section aria-labelledby="quota-cooldown" className="grid gap-3">
        <h2 id="quota-cooldown" className="text-base font-medium">
          {t("quota.cooldown")}
        </h2>
        {credentials.isPending && <Skeleton className="h-12 w-full" />}
        {credentials.isError && <p role="alert">{t("quota.credentialsError")}</p>}
        {credentials.isSuccess && credentials.data.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("quota.empty")}</p>
        )}
        {credentials.isSuccess && credentials.data.length > 0 && (
          <ul className="divide-y border-y">
            {credentials.data.map((file) => (
              <li
                key={file.id}
                data-slot="quota-credential"
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              >
                <span className="min-w-0 break-all">
                  {file.name} ({file.provider})
                </span>
                <ActionGroup>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={reset.isPending}
                    onClick={() => resetCooldown(file.authIndex)}
                  >
                    {t("quota.reset")}
                  </Button>
                </ActionGroup>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="quota-plugins" className="grid gap-3">
        <div>
          <h2 id="quota-plugins" className="text-base font-medium">
            {t("quota.pluginTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("quota.pluginUnavailable")}</p>
        </div>
      </section>
    </section>
  );
}
