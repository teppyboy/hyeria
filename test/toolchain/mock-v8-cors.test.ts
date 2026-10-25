import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { once } from "node:events";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";

const root = resolve(import.meta.dirname, "../..");
const methods = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
const headers = "authorization, content-type";
let child: ChildProcess | undefined;
let apiUrl = "";

async function findFreePort() {
  const listener = createServer();
  await new Promise<void>((resolveListen, reject) => {
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", resolveListen);
  });
  const address = listener.address();
  if (!address || typeof address === "string") throw new Error("failed to allocate a port");
  const port = address.port;
  await new Promise<void>((resolveClose, reject) =>
    listener.close((error) => (error ? reject(error) : resolveClose())),
  );
  return port;
}

async function waitForMock(url: string) {
  const deadline = Date.now() + 10_000;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${url}/health`)).ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error(`mock API did not become ready at ${url}`, { cause: lastError });
}

afterAll(async () => {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    once(child, "exit"),
    new Promise((resolveTimeout) => setTimeout(resolveTimeout, 2_000)),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
});

describe("mock v8 CORS", () => {
  beforeAll(async () => {
    const port = await findFreePort();
    apiUrl = `http://127.0.0.1:${port}`;
    child = spawn(process.execPath, ["e2e/mock-v8.mjs"], {
      cwd: root,
      env: { ...process.env, E2E_API_PORT: String(port) },
      stdio: "ignore",
    });
    await waitForMock(apiUrl);
  });

  it("allows trusted preflight origins without credentials", async () => {
    const trustedOrigins = ["http://localhost:4173", "http://127.0.0.1:5173"];
    const responses = await Promise.all(
      trustedOrigins.map((origin) =>
        fetch(`${apiUrl}/v8/management/config`, {
          method: "OPTIONS",
          headers: {
            Origin: origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": headers,
          },
        }),
      ),
    );

    for (const [response, origin] of responses.map(
      (response, index) => [response, trustedOrigins[index]] as const,
    )) {
      expect(response.status).toBe(204);
      expect(response.headers.get("access-control-allow-origin")).toBe(origin);
      expect(response.headers.get("access-control-allow-methods")).toBe(methods);
      expect(response.headers.get("access-control-allow-headers")).toBe(headers);
      expect(response.headers.get("access-control-allow-credentials")).toBeNull();
    }

    const untrusted = await fetch(`${apiUrl}/v8/management/config`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://untrusted.example",
        "Access-Control-Request-Method": "GET",
      },
    });
    expect(untrusted.status).toBe(204);
    expect(untrusted.headers.get("access-control-allow-origin")).toBeNull();
    expect(untrusted.headers.get("access-control-allow-credentials")).toBeNull();

    const regularResponse = await fetch(`${apiUrl}/health`, {
      headers: { Origin: "http://localhost:4173" },
    });
    expect(regularResponse.headers.get("access-control-allow-credentials")).toBeNull();
  });
});
