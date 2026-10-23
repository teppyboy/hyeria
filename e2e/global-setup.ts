import { execFileSync } from "node:child_process";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(".");
const compose = ["compose", "-p", "hyeria-e2e", "-f", "e2e/compose.yaml"];

export default async function globalSetup() {
  const port = Number(process.env.E2E_API_PORT ?? 8327);
  const container = process.env.E2E_API_DOCKER !== "0";
  const apiUrl = `http://127.0.0.1:${port}`;
  const key = "e2e-management-key";
  process.env.E2E_API_BASE = apiUrl;
  process.env.E2E_MANAGEMENT_KEY = key;
  process.env.E2E_API_DOCKER = container ? "1" : "0";
  if (container) {
    const generatedConfig = join(root, "node_modules/.tmp/hyeria-e2e-config.yaml");
    await mkdir(join(root, "node_modules/.tmp"), { recursive: true });
    await copyFile(join(root, "e2e/config.yaml"), generatedConfig);
    await writeFile(
      join(root, "e2e/.compose.env"),
      `CPA_IMAGE=${process.env.CPA_IMAGE ?? "eceasy/cli-proxy-api:v8.0.4"}\nE2E_API_PORT=${port}\nE2E_CONFIG=${generatedConfig}\n`,
    );
    execFileSync(
      "docker",
      [...compose, "--env-file", "e2e/.compose.env", "up", "-d", "--force-recreate"],
      {
        cwd: root,
        stdio: "inherit",
      },
    );
    await waitForBackend(`${apiUrl}/v8/management/config`, key);
    return;
  }

  await mkdir(join(root, "node_modules/.tmp"), { recursive: true });
  const pidFile = join(root, "node_modules/.tmp/hyeria-e2e-mock.pid");
  const { spawn } = await import("node:child_process");
  const child = spawn(process.execPath, ["e2e/mock-v8.mjs"], {
    cwd: root,
    detached: true,
    stdio: "ignore",
    env: { ...process.env, E2E_API_PORT: String(port) },
  });
  child.unref();
  await writeFile(pidFile, String(child.pid));
  await waitForBackend(`${apiUrl}/health`);
}

async function waitForBackend(url: string, key?: string) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    let response: Response | undefined;
    try {
      response = await fetch(url, {
        headers: key ? { Authorization: `Bearer ${key}` } : undefined,
      });
    } catch (error) {
      if (Date.now() + 500 >= deadline) {
        throw new Error(`E2E backend unavailable at ${url}`, { cause: error });
      }
    }
    if (response?.ok) return;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
  }
  throw new Error(`E2E backend did not become ready at ${url}`);
}
