import { useEffect, useReducer, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { translate } from "@/lib/i18n";
import { usePreferencesStore } from "@/stores/preferences";
import { authFileKeys } from "@/features/auth-files/queries";
import { parseHttpsUrl } from "../api";
import {
  type OAuthAuthUrl,
  type VertexImportResult,
  useCancelOAuthMutation,
  useImportVertexCredentialMutation,
  usePollOAuthMutation,
  useStartOAuthMutation,
} from "../queries";
import { reduceOAuthState, type OAuthState } from "../state-machine";

const providers = ["claude", "codex", "antigravity", "kimi", "kimi-ai", "xai", "devin", "meta"];
const POLL_INTERVAL_MS = 2_000;
const MAX_EXPIRY_MS = 15 * 60 * 1_000;

export function OAuthPage() {
  const language = usePreferencesStore((state) => state.language);
  const t = (key: string) => translate(language, key);
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState(providers[0]);
  const [state, dispatch] = useReducer(reduceOAuthState, { status: "idle" });
  const authRef = useRef<OAuthAuthUrl | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const start = useStartOAuthMutation();
  const { mutateAsync: pollAsync } = usePollOAuthMutation();
  const cancel = useCancelOAuthMutation();
  const vertexImport = useImportVertexCredentialMutation();
  const [vertexFile, setVertexFile] = useState<File | null>(null);
  const [vertexLocation, setVertexLocation] = useState("");
  const [deviceCode, setDeviceCode] = useState<string | null>(null);

  useEffect(() => {
    if (state.status !== "polling" || authRef.current === null) return;
    let stopped = false;
    let timer: number | undefined;
    const run = async () => {
      if (stopped || authRef.current === null) return;
      const auth = authRef.current;
      if (
        startedAtRef.current !== null &&
        Date.now() - startedAtRef.current >=
          Math.min(MAX_EXPIRY_MS, (auth.expiresIn ?? 900) * 1_000)
      ) {
        dispatch({ type: "expire" });
        return;
      }
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const result = await pollAsync({ state: auth.state, signal: controller.signal });
        if (!stopped) {
          dispatch({ type: "status", result });
          if (result === "wait") timer = window.setTimeout(run, POLL_INTERVAL_MS);
        }
      } catch {
        if (!stopped && !controller.signal.aborted)
          dispatch({ type: "fail", reason: "request-failed" });
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    };
    void run();
    return () => {
      stopped = true;
      if (timer !== undefined) window.clearTimeout(timer);
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [pollAsync, state.status]);

  useEffect(() => {
    if (state.status === "success") {
      void queryClient.invalidateQueries({ queryKey: authFileKeys.all });
    }
  }, [queryClient, state.status]);

  function resetTerminal() {
    if (state.status === "success" || state.status === "error" || state.status === "cancelled") {
      dispatch({ type: "reset" });
      authRef.current = null;
      startedAtRef.current = null;
      setDeviceCode(null);
    }
  }

  async function begin() {
    resetTerminal();
    setDeviceCode(null);
    dispatch({ type: "start", providerId: provider });
    try {
      const auth = await start.mutateAsync(provider);
      const url = parseHttpsUrl(auth.url);
      if (url === null) {
        dispatch({ type: "fail", reason: "request-failed" });
        return;
      }
      authRef.current = { ...auth, url };
      startedAtRef.current = Date.now();
      setDeviceCode(auth.userCode);
      dispatch({ type: "auth-url", flow: auth.flow });
      window.open(url, "_blank", "noopener,noreferrer");
      dispatch({ type: "poll" });
    } catch {
      dispatch({ type: "fail", reason: "request-failed" });
    }
  }

  function handleCancel() {
    const auth = authRef.current;
    abortRef.current?.abort();
    dispatch({ type: "cancel" });
    if (auth !== null) {
      cancel.mutate(auth.state);
    }
  }

  function importVertex() {
    if (vertexFile === null) return;
    vertexImport.mutate({
      file: vertexFile,
      ...(vertexLocation.trim() ? { location: vertexLocation.trim() } : {}),
    });
  }

  const active =
    state.status === "starting" || state.status === "awaiting-user" || state.status === "polling";
  const error = state.status === "error" ? t(`oauth.error.${state.reason}`) : null;
  const terminal =
    state.status === "success" || state.status === "error" || state.status === "cancelled";
  const vertexResult: VertexImportResult | undefined = vertexImport.data;

  return (
    <section className="mx-auto grid max-w-5xl gap-4">
      <h1 className="text-2xl font-semibold">{t("nav.oauth")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t("oauth.title")}</CardTitle>
          <CardDescription>{t("oauth.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="grid min-w-56 gap-1.5">
              <Label htmlFor="oauth-provider">{t("oauth.provider")}</Label>
              <select
                id="oauth-provider"
                className="h-9 rounded-md border bg-transparent px-3 text-sm"
                value={provider}
                onChange={(event) => setProvider(event.target.value)}
                disabled={active}
              >
                {providers.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={begin} disabled={active || start.isPending}>
              {t("oauth.start")}
            </Button>
            {active && (
              <Button variant="outline" onClick={handleCancel}>
                {t("oauth.cancel")}
              </Button>
            )}
            {terminal && (
              <Button variant="outline" onClick={resetTerminal}>
                {t("oauth.reset")}
              </Button>
            )}
          </div>
          {active && state.status !== "starting" && state.flow === "device" && deviceCode && (
            <p aria-live="polite">
              {t("oauth.deviceCode")}: <strong>{deviceCode}</strong>
            </p>
          )}
          {state.status === "success" && <p role="status">{t("oauth.success")}</p>}
          {state.status === "cancelled" && <p role="status">{t("oauth.cancelled")}</p>}
          {error && <p role="alert">{error}</p>}
          {cancel.isError && <p role="alert">{t("oauth.cancelError")}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("oauth.vertexTitle")}</CardTitle>
          <CardDescription>{t("oauth.vertexDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-1.5">
            <Label htmlFor="vertex-file">{t("oauth.vertexFile")}</Label>
            <Input
              id="vertex-file"
              type="file"
              accept=".json,application/json"
              onChange={(event) => setVertexFile(event.target.files?.[0] ?? null)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="vertex-location">{t("oauth.vertexLocation")}</Label>
            <Input
              id="vertex-location"
              value={vertexLocation}
              onChange={(event) => setVertexLocation(event.target.value)}
              placeholder="us-central1"
            />
          </div>
          <Button onClick={importVertex} disabled={vertexFile === null || vertexImport.isPending}>
            {t("oauth.vertexImport")}
          </Button>
          {vertexImport.isError && <p role="alert">{t("oauth.vertexError")}</p>}
          {vertexResult && (
            <p role="status">
              {t("oauth.vertexSuccess")}: {vertexResult.projectId} ({vertexResult.email},{" "}
              {vertexResult.location})
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

export type { OAuthState };
