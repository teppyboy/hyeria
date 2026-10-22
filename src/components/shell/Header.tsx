import { Link, useNavigate } from "react-router";
import { Info, Languages, LogOut, PanelLeft, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { preferencesStore, usePreferencesStore, type Theme } from "@/stores/preferences";
import { useUiStore, type ConfirmRequest } from "@/stores/ui";
import { useSessionStore } from "@/stores/session";
import { translate } from "@/lib/i18n";
import { MobileNav } from "@/components/shell/MobileNav";

const languages = [
  ["en", "English"],
  ["zh-CN", "简体中文"],
  ["zh-TW", "繁體中文"],
  ["ru", "Русский"],
] as const;
const themes: Theme[] = ["system", "light", "white", "dark"];

export function Header() {
  const navigate = useNavigate();
  const language = usePreferencesStore((state) => state.language);
  const theme = usePreferencesStore((state) => state.theme);
  const setLanguage = (value: typeof language) => preferencesStore.getState().setLanguage(value);
  const setTheme = (value: Theme) => preferencesStore.getState().setTheme(value);
  const setLegalOpen = (open: boolean) => useUiStore.getState().setLegalOpen(open);
  const toggleSidebar = () => useUiStore.getState().toggleSidebar();
  const disconnect = () => useSessionStore.getState().disconnect();
  const confirm = (request: ConfirmRequest) => useUiStore.getState().requestConfirm(request);
  const t = (key: string) => translate(language, key);
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background px-4">
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("shell.toggleSidebar")}
        aria-controls="app-navigation"
        aria-expanded={useUiStore((state) => state.sidebarOpen)}
        onClick={toggleSidebar}
        className="hidden md:inline-flex"
      >
        <PanelLeft />
      </Button>
      <MobileNav />
      <Link to="/" className="font-semibold">
        Hyeria
      </Link>
      <span className="hidden text-sm text-muted-foreground sm:inline">{t("app.tagline")}</span>
      <div className="ml-auto flex items-center gap-2">
        <label className="sr-only" htmlFor="language">
          {t("shell.language")}
        </label>
        <Languages className="size-4" />
        <select
          id="language"
          aria-label={t("shell.language")}
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={language}
          onChange={(event) => setLanguage(event.target.value as typeof language)}
        >
          {languages.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="theme">
          {t("shell.theme")}
        </label>
        <Palette className="size-4" />
        <select
          id="theme"
          aria-label={t("shell.theme")}
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={theme}
          onChange={(event) => setTheme(event.target.value as Theme)}
        >
          {themes.map((value) => (
            <option key={value} value={value}>
              {t(`theme.${value}`)}
            </option>
          ))}
        </select>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("shell.about")}
          onClick={() => setLegalOpen(true)}
        >
          <Info />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("shell.disconnect")}
          onClick={async () => {
            if (
              await confirm({
                title: t("shell.disconnectTitle"),
                description: t("shell.disconnectDescription"),
                confirmLabel: t("shell.confirm"),
                destructive: true,
              })
            ) {
              disconnect();
              void navigate("/login");
            }
          }}
        >
          <LogOut />
        </Button>
      </div>
    </header>
  );
}
