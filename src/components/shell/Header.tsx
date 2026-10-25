import { Link, useNavigate } from "react-router";
import { Info, Languages, LogOut, PanelLeft, Palette, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const isDemo = useSessionStore((state) => state.isDemo);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const setLanguage = (value: typeof language) => preferencesStore.getState().setLanguage(value);
  const setTheme = (value: Theme) => preferencesStore.getState().setTheme(value);
  const setLegalOpen = (open: boolean) => useUiStore.getState().setLegalOpen(open);
  const toggleSidebar = () => useUiStore.getState().toggleSidebar();
  const disconnect = () => useSessionStore.getState().disconnect();
  const confirm = (request: ConfirmRequest) => useUiStore.getState().requestConfirm(request);
  const t = (key: string) => translate(language, key);
  return (
    <header
      data-slot="app-header"
      className="sticky top-0 z-30 flex h-14 items-center gap-1 border-b bg-background px-2 sm:gap-3 sm:px-4"
    >
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
      <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-2">
        {isAuthenticated && (
          <span
            data-slot="connection-status"
            data-session-mode={isDemo ? "demo" : "connected"}
            role="status"
            className="min-h-11 max-w-36 truncate rounded-md border px-2 py-1 text-xs text-muted-foreground"
          >
            {isDemo ? t("shell.connectionDemo") : t("shell.connectionConnected")}
          </span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="min-h-11 gap-2 px-2"
              aria-label={t("shell.user")}
              title={t("shell.user")}
            >
              <User aria-hidden="true" />
              <span className="hidden sm:inline">{t("shell.user")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{t("shell.user")}</DropdownMenuLabel>
            {isAuthenticated && (
              <DropdownMenuLabel className="pt-0 text-xs font-normal text-muted-foreground">
                {isDemo ? t("shell.connectionDemo") : t("shell.connectionConnected")}
              </DropdownMenuLabel>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Languages aria-hidden="true" />
                {t("shell.language")}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={language}
                  onValueChange={(value) => setLanguage(value as typeof language)}
                >
                  {languages.map(([value, label]) => (
                    <DropdownMenuRadioItem key={value} value={value}>
                      {label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Palette aria-hidden="true" />
                {t("shell.theme")}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={theme}
                  onValueChange={(value) => setTheme(value as Theme)}
                >
                  {themes.map((value) => (
                    <DropdownMenuRadioItem key={value} value={value}>
                      {t(`theme.${value}`)}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setLegalOpen(true)}>
              <Info aria-hidden="true" />
              {t("shell.about")}
            </DropdownMenuItem>
            {isAuthenticated && (
              <DropdownMenuItem
                variant="destructive"
                onSelect={async () => {
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
                <LogOut aria-hidden="true" />
                {t("shell.disconnect")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
