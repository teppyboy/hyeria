import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardQuery } from "@/features/dashboard/queries";
import { useSessionStore } from "@/stores/session";
import { usePreferencesStore } from "@/stores/preferences";
import { translate } from "@/lib/i18n";
import type { ModelChannelAvailability } from "@/lib/feature-support/capabilities";

function ChannelRow({ channel }: { channel: ModelChannelAvailability }) {
  const language = usePreferencesStore((state) => state.language);
  const t = (key: string) => translate(language, key);
  const label =
    channel.state === "available"
      ? t("dashboard.channelAvailable")
      : channel.state === "empty"
        ? t("dashboard.channelEmpty")
        : channel.state === "unknown-channel"
          ? t("dashboard.channelUnknown")
          : channel.state === "loading"
            ? t("dashboard.channelLoading")
            : t("dashboard.channelError");
  return (
    <li className="flex items-center justify-between gap-2 text-sm">
      <span className="font-mono">{channel.channel}</span>
      <Badge variant="outline">{label}</Badge>
    </li>
  );
}

export function DashboardPage() {
  const language = usePreferencesStore((state) => state.language);
  const version = useSessionStore((state) => state.capabilities.version);
  const t = (key: string) => translate(language, key);
  const { snapshot, pluginsEnabled, plugins, credentials } = useDashboardQuery();

  return (
    <section className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2">
      <h1 className="text-2xl font-semibold md:col-span-2">{t("nav.dashboard")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.server")}</CardTitle>
          <CardDescription>{t("dashboard.serverDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            {t("dashboard.version")}: {snapshot.version ?? t("dashboard.unknown")}
          </p>
          <p>
            {t("dashboard.buildDate")}: {snapshot.buildDate ?? t("dashboard.unknown")}
          </p>
          <p>
            {t("dashboard.plugins")}:{" "}
            {snapshot.pluginSupport === "supported"
              ? t("dashboard.pluginsSupported")
              : snapshot.pluginSupport === "unsupported"
                ? t("dashboard.pluginsUnsupported")
                : plugins.isError
                  ? t("dashboard.pluginsUnavailable")
                  : t("dashboard.unknown")}
            {pluginsEnabled === true && ` · ${t("dashboard.pluginsEnabled")}`}
            {pluginsEnabled === false && ` · ${t("dashboard.pluginsDisabled")}`}
          </p>
          {version === null && <p className="text-muted-foreground">{t("dashboard.noHeaders")}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.credentials")}</CardTitle>
          <CardDescription>{t("dashboard.credentialsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          {credentials.isPending && <Skeleton className="h-16 w-full" />}
          {credentials.isError && <p role="alert">{t("dashboard.credentialsError")}</p>}
          {credentials.isSuccess && (
            <ul className="space-y-1">
              <li>
                {t("dashboard.total")}: {credentials.data.total}
              </li>
              <li>
                {t("dashboard.disabled")}: {credentials.data.disabled}
              </li>
              <li>
                {t("dashboard.unavailable")}: {credentials.data.unavailable}
              </li>
              <li>
                {t("dashboard.runtimeOnly")}: {credentials.data.runtimeOnly}
              </li>
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>{t("dashboard.models")}</CardTitle>
          <CardDescription>{t("dashboard.modelsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {credentials.isPending ? (
            <p className="text-sm text-muted-foreground">{t("dashboard.channelLoading")}</p>
          ) : credentials.isError ? (
            <p role="alert" className="text-sm text-muted-foreground">
              {t("dashboard.credentialsError")}
            </p>
          ) : snapshot.modelChannels.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("dashboard.noChannels")}</p>
          ) : (
            <ul className="space-y-2">
              {snapshot.modelChannels.map((channel) => (
                <ChannelRow key={channel.channel} channel={channel} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {plugins.isError && (
        <p role="alert" className="text-sm text-muted-foreground md:col-span-2">
          {t("dashboard.endpointError")}
        </p>
      )}
    </section>
  );
}
