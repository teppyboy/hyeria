import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const { latestVersion, modelDefinitions, forgetRememberedSession } = useSystemQueries();
  const comparison = latestVersion.isSuccess
    ? compareVersions(current, latestVersion.data)
    : "unknown";

  return (
    <section className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2">
      <h1 className="text-2xl font-semibold md:col-span-2">{t("nav.system")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("system.latestVersion")}</CardTitle>
          <CardDescription>{t("system.latestVersionDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {latestVersion.isPending && <Skeleton className="h-10 w-full" />}
          {latestVersion.isError && <p role="alert">{t("system.latestVersionError")}</p>}
          {latestVersion.isSuccess && (
            <>
              <p>
                {t("system.latest")}: {latestVersion.data}
              </p>
              <p>
                {t("system.current")}: {current ?? t("dashboard.unknown")}
              </p>
              <p>{t(`system.compare.${comparison}`)}</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("system.modelChannels")}</CardTitle>
          <CardDescription>{t("system.modelChannelsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          {modelDefinitions.length === 0 ? (
            <p className="text-muted-foreground">{t("system.noChannels")}</p>
          ) : (
            <ul className="space-y-1">
              {modelDefinitions.map((query, index) => (
                <li key={index} className="flex justify-between">
                  {query.isPending && <Skeleton className="h-4 w-full" />}
                  {query.isError && <span>{t("system.channelError")}</span>}
                  {query.isSuccess && (
                    <span>
                      {t("system.channelCount")}: {query.data}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>{t("system.session")}</CardTitle>
          <CardDescription>{t("system.sessionDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            disabled={forgetRememberedSession.isPending}
            onClick={() => forgetRememberedSession.mutate()}
          >
            {t("system.forgetSession")}
          </Button>
          {forgetRememberedSession.isSuccess && (
            <p role="status" className="mt-2 text-sm">
              {t("system.forgotten")}
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
