import { useEffect, type ReactNode } from "react";
import { usePreferencesStore } from "@/stores/preferences";
import { Header } from "@/components/shell/Header";
import { Sidebar } from "@/components/shell/Sidebar";
import { useUiStore } from "@/stores/ui";
import { useSessionStore } from "@/stores/session";
import { NotificationProvider } from "@/components/feedback/NotificationProvider";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { ErrorBoundary } from "@/components/feedback/ErrorBoundary";
import { LegalNotice } from "@/components/feedback/LegalNotice";
import { translate } from "@/lib/i18n";
import { DemoBanner } from "@/features/demo/DemoBanner";

export function AppShell({ children }: { children: ReactNode }) {
  const language = usePreferencesStore((state) => state.language);
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const legalOpen = useUiStore((state) => state.legalOpen);
  const revision = useSessionStore((state) => state.connectionRevision);
  const isDemo = useSessionStore((state) => state.isDemo);
  const t = (key: string) => translate(language, key);

  useEffect(() => {
    useUiStore.getState().reset();
  }, [revision]);
  return (
    <div className="min-h-screen bg-background text-foreground">
      {isDemo && <DemoBanner />}
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:p-3"
        href="#main-content"
      >
        {t("shell.skip")}
      </a>
      <Header />
      <div className="flex min-h-[calc(100vh-3.5rem)]">
        <aside
          id="app-navigation"
          className={`hidden w-60 shrink-0 border-r bg-sidebar p-3 ${sidebarOpen ? "md:block" : "md:hidden"}`}
        >
          <Sidebar />
        </aside>
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 p-4 md:p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
      <NotificationProvider />
      <ConfirmDialog />
      <LegalNotice
        open={legalOpen}
        onOpenChange={(open) => useUiStore.getState().setLegalOpen(open)}
      />
    </div>
  );
}
