import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router";
import { usePreferencesStore } from "@/stores/preferences";
import { translate } from "@/lib/i18n";
import { ProtectedLayout } from "@/routes/protected-layout";
import { LoginPage } from "@/routes/login";
import { DashboardPage } from "@/features/dashboard/routes/DashboardPage";
import { SystemPage } from "@/features/system/routes/SystemPage";
import { ConfigPage } from "@/features/config/routes/ConfigPage";
import { ProvidersPage } from "@/features/providers/routes/ProvidersPage";
import { AuthFilesPage } from "@/features/auth-files/routes/AuthFilesPage";
import { OAuthPage } from "@/features/oauth/routes/OAuthPage";
import { QuotaPage } from "@/features/quota/routes/QuotaPage";
import { LogsPage } from "@/features/logs/routes/LogsPage";
import { PluginsPage } from "@/features/plugins/routes/PluginsPage";
import { PluginStorePage } from "@/features/plugins/routes/PluginStorePage";
import { AnalyticsPage } from "@/features/analytics/routes/AnalyticsPage";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import { WorkspaceState } from "@/components/workspace/WorkspaceState";

function UnavailablePage() {
  const language = usePreferencesStore((state) => state.language);
  const t = (key: string) => translate(language, key);
  return (
    <section className="mx-auto grid max-w-5xl gap-6">
      <WorkspaceHeader title={t("app.name")} />
      <WorkspaceState kind="unavailable" title={t("nav.unavailable")} />
    </section>
  );
}

export function App() {
  const language = usePreferencesStore((state) => state.language);
  const theme = usePreferencesStore((state) => state.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = language;
  }, [theme, language]);
  return (
    <div data-app="hyeria">
      <h1 className="sr-only">Hyeria</h1>
      <p className="sr-only">{translate(language, "app.tagline")}</p>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/settings" element={<Navigate to="/config" replace />} />
          <Route path="/api-keys" element={<Navigate to="/config" replace />} />
          <Route path="/quick-start" element={<UnavailablePage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/plugins" element={<PluginsPage />} />
          <Route path="/plugin-store" element={<PluginStorePage />} />
          <Route path="/quota" element={<QuotaPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/ai-providers" element={<ProvidersPage />} />
          <Route path="/auth-files" element={<AuthFilesPage />} />
          <Route path="/oauth" element={<OAuthPage />} />
          <Route path="/config" element={<ConfigPage />} />
          <Route path="/system" element={<SystemPage />} />
          <Route path="*" element={<UnavailablePage />} />
        </Route>
      </Routes>
    </div>
  );
}
