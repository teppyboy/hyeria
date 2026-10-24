import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ActionGroup } from "@/components/workspace/ActionGroup";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
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
  usePostOAuthCallbackMutation,
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
  const flowIdRef = useRef(0);
  const start = useStartOAuthMutation();
  const { mutateAsync: pollAsync } = usePollOAuthMutation();
  const { mutateAsync: cancelAsync, ...cancel } = useCancelOAuthMutation();
  const callback = usePostOAuthCallbackMutation();
  const vertexImport = useImportVertexCredentialMutation();
  const [vertexFile, setVertexFile] = useState<File | null>(null);
  const [vertexLocation, setVertexLocation] = useState("");
  const [deviceCode, setDeviceCode] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState("");
  const [callbackInputError, setCallbackInputError] = useState(false);
  const [authorizationUrl, setAuthorizationUrl] = useState<string | null>(null);
  const callbackAbortRef = useRef<AbortController | null>(null);
  const popupRef = useRef<Window | null>(null);

  const cancelServerState = useCallback(
    (stateValue: string) => void cancelAsync(stateValue).catch(() => undefined),
    [cancelAsync],
  );

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
        cancelServerState(auth.state);
        authRef.current = null;
        setDeviceCode(null);
        setRedirectUrl("");
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
        if (!stopped && !controller.signal.aborted) {
          cancelServerState(auth.state);
          authRef.current = null;
          setDeviceCode(null);
          setRedirectUrl("");
          dispatch({ type: "fail", reason: "request-failed" });
        }
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
  }, [cancelServerState, pollAsync, state.status]);

  useEffect(() => {
    if (state.status === "success") {
      void queryClient.invalidateQueries({ queryKey: authFileKeys.all });
    }
  }, [queryClient, state.status]);

  useEffect(() => {
    return () => {
      flowIdRef.current += 1;
      abortRef.current?.abort();
      callbackAbortRef.current?.abort();
      popupRef.current?.close();
      const auth = authRef.current;
      if (auth !== null) void cancelAsync(auth.state).catch(() => undefined);
    };
  }, [cancelAsync]);

  function resetTerminal() {
    if (state.status === "success" || state.status === "error" || state.status === "cancelled") {
      flowIdRef.current += 1;
      dispatch({ type: "reset" });
      authRef.current = null;
      startedAtRef.current = null;
      setDeviceCode(null);
      setRedirectUrl("");
      setAuthorizationUrl(null);
      callbackAbortRef.current?.abort();
      callback.reset();
      setCallbackInputError(false);
    }
  }

  async function begin() {
    resetTerminal();
    const flowId = flowIdRef.current;
    setDeviceCode(null);
    setRedirectUrl("");
    setCallbackInputError(false);
    callback.reset();
    cancel.reset();
    setAuthorizationUrl(null);
    popupRef.current = window.open("about:blank", "_blank");
    if (popupRef.current !== null) {
      popupRef.current.opener = null;
      popupRef.current.document.title = t("oauth.popupTitle");
      popupRef.current.document.body.textContent = t("oauth.popupWaiting");
    }
    dispatch({ type: "start", providerId: provider });
    try {
      const auth = await start.mutateAsync(provider);
      if (flowId !== flowIdRef.current) {
        cancelServerState(auth.state);
        return;
      }
      const url = parseHttpsUrl(auth.url);
      if (url === null) {
        popupRef.current?.close();
        popupRef.current = null;
        cancelServerState(auth.state);
        dispatch({ type: "fail", reason: "request-failed" });
        return;
      }
      authRef.current = { ...auth, url };
      startedAtRef.current = Date.now();
      setDeviceCode(auth.userCode);
      dispatch({ type: "auth-url", flow: auth.flow });
      if (popupRef.current !== null) {
        popupRef.current.location.replace(url);
        popupRef.current = null;
      } else {
        setAuthorizationUrl(url);
      }
      dispatch({ type: "poll" });
    } catch {
      popupRef.current?.close();
      popupRef.current = null;
      if (flowId === flowIdRef.current) dispatch({ type: "fail", reason: "request-failed" });
    }
  }

  function handleCancel() {
    flowIdRef.current += 1;
    const auth = authRef.current;
    abortRef.current?.abort();
    callbackAbortRef.current?.abort();
    popupRef.current?.close();
    popupRef.current = null;
    authRef.current = null;
    setDeviceCode(null);
    setRedirectUrl("");
    setAuthorizationUrl(null);
    callback.reset();
    dispatch({ type: "cancel" });
    if (auth !== null) cancelServerState(auth.state);
  }

  async function completeCallback() {
    const auth = authRef.current;
    const flowId = flowIdRef.current;
    const value = redirectUrl.trim();
    if (auth === null || value === "") return;
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      setCallbackInputError(true);
      return;
    }
    if (parsed.protocol !== "https:") {
      setCallbackInputError(true);
      return;
    }
    setCallbackInputError(false);
    const controller = new AbortController();
    callbackAbortRef.current = controller;
    try {
      await callback.mutateAsync({
        body: { provider, state: auth.state, redirect_url: parsed.href },
        signal: controller.signal,
      });
      if (flowId === flowIdRef.current) {
        setRedirectUrl("");
        authRef.current = null;
        setDeviceCode(null);
        dispatch({ type: "callback" });
      }
    } catch {
      setRedirectUrl("");
      setCallbackInputError(false);
      // The mutation error is rendered below; callback values remain memory-only.
    } finally {
      if (callbackAbortRef.current === controller) callbackAbortRef.current = null;
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
    <section className="mx-auto grid max-w-5xl gap-6">
      <WorkspaceHeader title={t("nav.oauth")} description={t("oauth.description")} />
      <section aria-labelledby="oauth-provider" className="grid gap-3">
        <h2 id="oauth-provider" className="text-base font-medium">
          {t("oauth.title")}
        </h2>
        <Card>
          <CardHeader>
            <CardDescription>{t("oauth.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-2">
              <div className="grid min-w-56 gap-1.5">
                <Label htmlFor="oauth-provider-select">{t("oauth.provider")}</Label>
                <select
                  id="oauth-provider-select"
                  className="min-h-11 rounded-md border bg-transparent px-3 text-sm"
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
              <ActionGroup>
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
              </ActionGroup>
            </div>
          </CardContent>
        </Card>
      </section>
      <section aria-labelledby="oauth-state" className="grid gap-3">
        <h2 id="oauth-state" className="text-base font-medium">
          {t("oauth.state")}
        </h2>
        <Card>
          <CardContent className="space-y-4 pt-6">
            {active && state.status !== "starting" && state.flow === "device" && deviceCode && (
              <p aria-live="polite">
                {t("oauth.deviceCode")}: <strong>{deviceCode}</strong>
              </p>
            )}
            {authorizationUrl && (
              <a
                className="inline-flex min-h-11 items-center text-sm underline"
                href={authorizationUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("oauth.openAuthorization")}
              </a>
            )}
            {(state.status === "awaiting-user" || state.status === "polling") && (
              <div className="grid gap-1.5">
                <Label htmlFor="oauth-redirect-url">{t("oauth.redirectUrl")}</Label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    id="oauth-redirect-url"
                    value={redirectUrl}
                    onChange={(event) => {
                      setRedirectUrl(event.target.value);
                      setCallbackInputError(false);
                    }}
                    placeholder="https://..."
                    autoComplete="off"
                    spellCheck={false}
                    disabled={callback.isPending}
                  />
                  <Button
                    variant="outline"
                    onClick={() => void completeCallback()}
                    disabled={callback.isPending || redirectUrl.trim() === ""}
                  >
                    {t("oauth.completeCallback")}
                  </Button>
                </div>
                {callbackInputError && <p role="alert">{t("oauth.invalidRedirectUrl")}</p>}
                {callback.isError && <p role="alert">{t("oauth.callbackError")}</p>}
              </div>
            )}
            {state.status === "success" && <p role="status">{t("oauth.success")}</p>}
            {state.status === "cancelled" && <p role="status">{t("oauth.cancelled")}</p>}
            {error && <p role="alert">{error}</p>}
            {cancel.isError && <p role="alert">{t("oauth.cancelError")}</p>}
          </CardContent>
        </Card>
      </section>
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
