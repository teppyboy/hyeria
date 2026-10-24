import { ActionGroup } from "@/components/workspace/ActionGroup";
import { StatusCell } from "@/components/workspace/StatusCell";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSystemQueries } from "@/features/system/queries";
import { compareVersions } from "@/lib/feature-support/capabilities";
import { useSessionStore } from "@/stores/session";
import { usePreferencesStore } from "@/stores/preferences";
import { translate } from "@/lib/i18n";

export function SystemPage() {
  const language = usePreferencesStore((state) => state.language);
  const current = useSessionStore((state) => state.capabilities.version);
  const t = (key: string) => translate(language, key);
  const { latestVersion, credentials, channels, modelDefinitions, forgetRememberedSession } =
    useSystemQueries();
  const comparison = latestVersion.isSuccess
    ? compareVersions(current, latestVersion.data)
    : "unknown";

  return (
    <section className="mx-auto grid max-w-5xl gap-6">
      <WorkspaceHeader title={t("nav.system")} />

      <section aria-labelledby="system-latest" className="grid gap-3">
        <div>
          <h2 id="system-latest" className="text-base font-medium">
            {t("system.latestVersion")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("system.latestVersionDescription")}</p>
        </div>
        {latestVersion.isPending && <Skeleton className="h-10 w-full" />}
        {latestVersion.isError && <p role="alert">{t("system.latestVersionError")}</p>}
        {latestVersion.isSuccess && (
          <div className="grid gap-4 border-y py-4 sm:grid-cols-2">
            <StatusCell label={t("system.latest")} value={latestVersion.data} />
            <StatusCell
              label={t("system.current")}
              value={current ?? t("dashboard.unknown")}
              tone={comparison === "update-available" ? "warning" : "default"}
              detail={t(`system.compare.${comparison}`)}
            />
          </div>
        )}
      </section>

      <section aria-labelledby="system-channels" className="grid gap-3">
        <div>
          <h2 id="system-channels" className="text-base font-medium">
            {t("system.modelChannels")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("system.modelChannelsDescription")}</p>
        </div>
        {credentials.isPending ? (
          <p className="text-sm text-muted-foreground">{t("dashboard.channelLoading")}</p>
        ) : credentials.isError ? (
          <p role="alert" className="text-sm text-muted-foreground">
            {t("dashboard.credentialsError")}
          </p>
        ) : channels.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("system.noChannels")}</p>
        ) : (
          <ul className="divide-y border-y">
            {channels.map((channel, index) => {
              const query = modelDefinitions[index];
              return (
                <li key={channel} className="flex justify-between gap-2 py-3 text-sm">
                  <span className="font-mono">{channel}</span>
                  {query?.isPending && <Skeleton className="h-4 w-24" />}
                  {query?.isError && <span>{t("system.channelError")}</span>}
                  {query?.isSuccess && (
                    <span className="font-mono">
                      {t("system.channelCount")}: {query.data}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="system-session" className="grid gap-3">
        <div>
          <h2 id="system-session" className="text-base font-medium">
            {t("system.session")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("system.sessionDescription")}</p>
        </div>
        <ActionGroup>
          <Button
            variant="outline"
            disabled={forgetRememberedSession.isPending}
            onClick={() => forgetRememberedSession.mutate()}
          >
            {t("system.forgetSession")}
          </Button>
        </ActionGroup>
        {forgetRememberedSession.isSuccess && (
          <p role="status" className="text-sm">
            {t("system.forgotten")}
          </p>
        )}
      </section>
    </section>
  );
}
