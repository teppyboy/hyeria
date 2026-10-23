import { createServer } from "node:http";

const port = Number(process.env.E2E_API_PORT ?? 8327);
const key = process.env.E2E_MANAGEMENT_KEY ?? "e2e-management-key";
let yaml = `config-version: 8\nserver:\n  host: 0.0.0.0\n  port: 8317\nmanagement:\n  secret-key: E2E_TEST_HASH\n  allow-remote: true\nobservability:\n  logs:\n    logging-to-file: true\n`;
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const send = (status, value, type = "application/json") => {
    res.writeHead(status, {
      "content-type": type,
      "x-cpa-version": "v8.0.4",
      "x-cpa-support-plugin": "true",
    });
    res.end(type === "application/yaml" ? value : JSON.stringify(value));
  };
  if (url.pathname === "/health") return send(200, { ok: true });
  if (!url.pathname.startsWith("/v8/management")) return send(404, { error: "not_found" });
  if (!url.pathname.endsWith("/oauth/callback") && req.headers.authorization !== `Bearer ${key}`) {
    return send(401, { error: "invalid management key" });
  }
  const path = url.pathname.slice("/v8/management".length);
  if (path === "/config" && req.method === "GET")
    return send(200, {
      port: 8317,
      "api-keys": { codex: [{ name: "e2e-key", "api-key": "" }] },
      "auth-dir": ".auth",
      "proxy-url": "",
    });
  if (path === "/config.yaml" && req.method === "GET")
    return send(
      200,
      yaml.replace("E2E_TEST_HASH", process.env.E2E_TEST_HASH ?? "E2E_TEST_HASH"),
      "application/yaml",
    );
  if (path === "/observability/status" && req.method === "GET")
    return send(200, { version: "v8.0.4", "build-date": "2026-09-29T00:13:14Z" });
  if (path === "/config.yaml" && req.method === "PUT") {
    let body = "";
    for await (const chunk of req) body += chunk;
    yaml = body;
    return send(200, { status: "ok", "config-version": 8 });
  }
  if (path === "/credentials" && req.method === "GET")
    return send(200, {
      files: [
        {
          id: "e2e-auth",
          auth_index: "e2e-auth",
          name: "e2e.json",
          provider: "codex",
          status: "active",
          disabled: false,
          unavailable: false,
          runtime_only: false,
          source: "file",
        },
      ],
    });
  if (path === "/credentials" && req.method === "POST") {
    for await (const _ of req) {
    }
    return send(200, { status: "ok" });
  }
  if (path === "/credentials" && req.method === "DELETE")
    return send(200, url.searchParams.has("all") ? { status: "ok", deleted: 1 } : { status: "ok" });
  if (path === "/credentials/status" && req.method === "PATCH") return send(200, { status: "ok" });
  if (path === "/credentials/refresh" && req.method === "POST") return send(200, { status: "ok" });
  if (path === "/credentials/models" && req.method === "GET") return send(200, { models: [] });
  if (path === "/routing/cooldown/reset" && req.method === "POST") {
    let body = "";
    for await (const chunk of req) body += chunk;
    try {
      return send(200, { status: "ok", auth_index: JSON.parse(body).auth_index, models: [] });
    } catch {
      return send(400, { error: "invalid_json" });
    }
  }
  if (path === "/observability/logs" && req.method === "GET")
    return send(200, {
      lines: ["E2E log line"],
      "line-count": 1,
      "latest-timestamp": 0,
      "next-cursor": "",
      "cursor-reset": false,
    });
  if (path === "/observability/logs" && req.method === "DELETE")
    return send(200, { success: true, message: "cleared", removed: 1 });
  if (path === "/observability/logs/errors" && req.method === "GET")
    return send(200, { files: [] });
  if (path === "/observability/usage/api-keys" && req.method === "GET") return send(200, {});
  if (path === "/plugins" && req.method === "GET")
    return send(200, { plugins_enabled: true, plugins: [{ id: "e2e-plugin", enabled: true }] });
  if (path === "/config/plugins" && req.method === "GET")
    return send(200, { enabled: true, configs: {} });
  if (path === "/plugins/store" && req.method === "GET")
    return send(200, {
      plugins: [{ id: "e2e-store-plugin", source_id: "official", version: "1.0" }],
    });
  if (path === "/oauth/auth-url" && req.method === "GET")
    return send(200, { status: "ok", url: "https://example.invalid/oauth", state: "e2e-state" });
  if (path === "/oauth/status" && req.method === "GET") return send(200, { status: "wait" });
  if (path === "/oauth/session" && req.method === "DELETE")
    return send(200, { status: "ok", cancelled: true });
  return send(404, { error: "not_found" });
});
server.listen(port, "0.0.0.0");
