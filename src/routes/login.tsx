import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { useConnectMutation } from "@/features/auth/queries";
import { sessionStore, useSessionStore } from "@/stores/session";
import { InvalidConnectionInputError } from "@/lib/connection/normalize-api-base";
import { ApiError } from "@/lib/api/errors";
import { usePreferencesStore } from "@/stores/preferences";
import { translate } from "@/lib/i18n";
import { useUiStore } from "@/stores/ui";
import { LegalNotice } from "@/components/feedback/LegalNotice";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function safeFrom(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\") ||
    value === "/login" ||
    value.startsWith("/login?")
  )
    return "/";
  return value;
}
function errorText(error: unknown, fallback: string): string {
  if (error instanceof ApiError || error instanceof InvalidConnectionInputError)
    return error.message;
  return fallback;
}

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const mutation = useConnectMutation();
  const authenticated = useSessionStore((state) => state.isAuthenticated);
  const apiBase = useSessionStore((state) => state.apiBase);
  const endReason = useSessionStore((state) => state.endReason);
  const isDemo = useSessionStore((state) => state.isDemo);
  const language = usePreferencesStore((state) => state.language);
  const legalOpen = useUiStore((state) => state.legalOpen);
  const setLegalOpen = (open: boolean) => useUiStore.getState().setLegalOpen(open);
  const attempted = useRef(false);
  const [restoring, setRestoring] = useState(true);
  const [address, setAddress] = useState(
    () =>
      apiBase ??
      `${window.location.origin}${window.location.pathname === "/login" ? "/" : window.location.pathname}`.replace(
        /\/(?:login|management\.html)$/,
        "",
      ),
  );
  const [key, setKey] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const t = (name: string) => translate(language, name);
  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    if (isDemo) return;
    void sessionStore
      .getState()
      .restoreRememberedConnection()
      .finally(() => setRestoring(false));
  }, [isDemo]);
  useEffect(() => {
    if (authenticated)
      void navigate(safeFrom((location.state as { from?: unknown } | null)?.from), {
        replace: true,
      });
  }, [authenticated, location.state, navigate]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await mutation.mutateAsync({ apiBase: address, managementKey: key, remember });
      setKey("");
    } catch (caught) {
      setError(errorText(caught, t("login.invalid")));
    }
  }
  if (isDemo)
    return (
      <main className="grid min-h-screen place-items-center bg-background p-4">
        <section className="w-full max-w-md space-y-5 rounded-xl border bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Interactive demo</h1>
          <p className="text-sm text-muted-foreground">
            This demo does not use an API address or management key. Return to the dashboard to
            explore simulated actions.
          </p>
          <Button
            type="button"
            onClick={() => void navigate("/", { replace: true })}
            className="w-full"
          >
            Open demo dashboard
          </Button>
        </section>
      </main>
    );
  if (restoring && !authenticated)
    return (
      <main className="grid min-h-screen place-items-center" aria-live="polite">
        {t("login.restoring")}
      </main>
    );
  return (
    <main className="grid min-h-screen place-items-center bg-background p-4">
      <section className="w-full max-w-md space-y-5 rounded-xl border bg-card p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold">{t("login.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("app.tagline")}</p>
        </div>
        {endReason === "unauthorized" && (
          <p role="alert" className="rounded-md border border-destructive p-3">
            {t("login.unauthorized")}
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-md border border-destructive p-3">
            {error}
          </p>
        )}
        <form onSubmit={submit} className="space-y-4">
          <label className="grid gap-1 text-sm">
            {t("login.address")}
            <Input
              required
              autoComplete="url"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            {t("login.key")}
            <Input
              required
              type="password"
              autoComplete="off"
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span>
              {t("login.remember")}
              <span className="mt-1 block text-xs text-muted-foreground">
                {t("login.rememberWarning")}
              </span>
            </span>
          </label>
          <Button
            type="submit"
            disabled={mutation.isPending || !key.trim()}
            aria-busy={mutation.isPending}
            className="w-full"
          >
            {mutation.isPending ? t("login.connecting") : t("login.connect")}
          </Button>
        </form>
        <Button type="button" variant="link" onClick={() => setLegalOpen(true)} className="px-0">
          {t("shell.about")}
        </Button>
      </section>
      <LegalNotice open={legalOpen} onOpenChange={setLegalOpen} />
    </main>
  );
}
