import { Badge } from "@/components/ui/badge";
import { StatusCell } from "@/components/workspace/StatusCell";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import { WorkspaceState } from "@/components/workspace/WorkspaceState";
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
    <li className="flex items-center justify-between gap-3 py-3 text-sm">
      <span className="min-w-0 truncate font-mono">{channel.channel}</span>
      <div className="flex shrink-0 items-center gap-3">
        {channel.modelCount !== null && (
          <span className="font-mono text-muted-foreground">
            {t("system.channelCount")}: {channel.modelCount}
          </span>
        )}
        <Badge variant="outline">{label}</Badge>
      </div>
    </li>
  );
}

export function DashboardPage() {
  const language = usePreferencesStore((state) => state.language);
  const isDemo = useSessionStore((state) => state.isDemo);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const version = useSessionStore((state) => state.capabilities.version);
  const t = (key: string) => translate(language, key);
  const { snapshot, pluginsEnabled, plugins, credentials } = useDashboardQuery();

  const pluginValue =
    snapshot.pluginSupport === "supported"
      ? t("dashboard.pluginsSupported")
      : snapshot.pluginSupport === "unsupported"
        ? t("dashboard.pluginsUnsupported")
        : plugins.isError
          ? t("dashboard.pluginsUnavailable")
          : t("dashboard.unknown");
  const pluginDetail =
    pluginsEnabled === true
      ? t("dashboard.pluginsEnabled")
      : pluginsEnabled === false
        ? t("dashboard.pluginsDisabled")
        : undefined;

  return (
    <section className="mx-auto grid max-w-5xl gap-6">
      <WorkspaceHeader
        title={t("nav.dashboard")}
        description={t("dashboard.operationsDescription")}
        status={
          isAuthenticated && (
            <span
              data-session-mode={isDemo ? "demo" : "connected"}
              className="rounded-md border px-2 py-1 text-xs text-muted-foreground"
            >
              {isDemo ? t("shell.connectionDemo") : t("shell.connectionConnected")}
            </span>
          )
        }
      />

      <section aria-labelledby="dashboard-server" className="grid gap-3">
        <div>
          <h2 id="dashboard-server" className="text-base font-medium">
            {t("dashboard.server")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("dashboard.serverDescription")}</p>
        </div>
        <div className="grid gap-4 border-y py-4 sm:grid-cols-3">
          <StatusCell
            label={t("dashboard.version")}
            value={snapshot.version ?? t("dashboard.unknown")}
          />
          <StatusCell
            label={t("dashboard.buildDate")}
            value={snapshot.buildDate ?? t("dashboard.unknown")}
          />
          <StatusCell label={t("dashboard.plugins")} value={pluginValue} detail={pluginDetail} />
        </div>
        {version === null && (
          <p className="text-sm text-muted-foreground">{t("dashboard.noHeaders")}</p>
        )}
      </section>

      <section aria-labelledby="dashboard-readiness" className="grid gap-3">
        <div>
          <h2 id="dashboard-readiness" className="text-base font-medium">
            {t("dashboard.credentials")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("dashboard.credentialsDescription")}</p>
        </div>
        {credentials.isPending && (
          <WorkspaceState kind="loading" title={t("dashboard.channelLoading")} />
        )}
        {credentials.isError && (
          <WorkspaceState kind="error" title={t("dashboard.credentialsError")} />
        )}
        {credentials.isSuccess && (
          <div className="grid gap-4 sm:grid-cols-4">
            <StatusCell label={t("dashboard.total")} value={credentials.data.total} />
            <StatusCell
              label={t("dashboard.disabled")}
              value={credentials.data.disabled}
              tone={credentials.data.disabled > 0 ? "warning" : "default"}
            />
            <StatusCell
              label={t("dashboard.unavailable")}
              value={credentials.data.unavailable}
              tone={credentials.data.unavailable > 0 ? "destructive" : "default"}
            />
            <StatusCell
              label={t("dashboard.runtimeOnly")}
              value={credentials.data.runtimeOnly}
              tone="info"
            />
          </div>
        )}
      </section>

      <section aria-labelledby="dashboard-channels" className="grid gap-3">
        <div>
          <h2 id="dashboard-channels" className="text-base font-medium">
            {t("dashboard.models")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("dashboard.modelsDescription")}</p>
        </div>
        {credentials.isPending ? (
          <WorkspaceState kind="loading" title={t("dashboard.channelLoading")} />
        ) : credentials.isError ? (
          <p role="alert" className="text-sm text-muted-foreground">
            {t("dashboard.credentialsError")}
          </p>
        ) : snapshot.modelChannels.length === 0 ? (
          <WorkspaceState kind="empty" title={t("dashboard.noChannels")} />
        ) : (
          <ul className="divide-y border-y">
            {snapshot.modelChannels.map((channel) => (
              <ChannelRow key={channel.channel} channel={channel} />
            ))}
          </ul>
        )}
      </section>

      {plugins.isError && (
        <p role="alert" className="text-sm text-muted-foreground">
          {t("dashboard.endpointError")}
        </p>
      )}
    </section>
  );
}
