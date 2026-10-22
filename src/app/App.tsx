import { Navigate, Route, Routes } from "react-router";
import { usePreferencesStore } from "@/stores/preferences";
import { translate } from "@/lib/i18n";
import { ProtectedLayout } from "@/routes/protected-layout";
import { LoginPage } from "@/routes/login";
import { DashboardPage } from "@/features/dashboard/routes/DashboardPage";
import { SystemPage } from "@/features/system/routes/SystemPage";

function UnavailablePage() {
  const language = usePreferencesStore((state) => state.language);
  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">Hyeria</h1>
      <p className="mt-2 text-muted-foreground">{translate(language, "nav.unavailable")}</p>
    </section>
  );
}
export function App() {
  const language = usePreferencesStore((state) => state.language);
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
          {[
            "quick-start",
            "ai-providers",
            "auth-files",
            "oauth",
            "quota",
            "logs",
            "analytics",
            "config",
            "plugins",
            "plugin-store",
          ].map((path) => (
            <Route key={path} path={`/${path}`} element={<UnavailablePage />} />
          ))}
          <Route path="/system" element={<SystemPage />} />
          <Route path="*" element={<UnavailablePage />} />
        </Route>
      </Routes>
    </div>
  );
}
