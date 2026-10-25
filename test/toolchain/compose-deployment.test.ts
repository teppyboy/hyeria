import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { parse } from "yaml";

const root = resolve(import.meta.dirname, "../..");

function readProjectFile(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("disposable compose deployment", () => {
  it("builds the dashboard image with the management artifact", () => {
    const dockerfile = readProjectFile("Dockerfile");

    expect(dockerfile).toContain("FROM node:24");
    expect(dockerfile).toContain("vp install --frozen-lockfile");
    expect(dockerfile).toContain("vp run build:management");
    expect(dockerfile).toContain("/usr/share/nginx/html/index.html");
    expect(dockerfile).toContain("/usr/share/nginx/html/management.html");
  });

  it("keeps both services loopback-only and disposable", () => {
    const compose = parse(readProjectFile("docker-compose.yml"));

    expect(compose.services.dashboard.ports).toEqual(["127.0.0.1:18080:80"]);
    expect(compose.services.cpa.image).toBe("eceasy/cli-proxy-api:latest");
    expect(compose.services.cpa.ports).toEqual(["127.0.0.1:18317:8317"]);
    expect(compose.volumes).toBeUndefined();
    expect(compose.services.dashboard.volumes).toBeUndefined();
    expect(compose.services.cpa.volumes).toEqual([
      "./docker/cpa/config.yaml:/CLIProxyAPI/config.yaml:rw",
    ]);
  });

  it("uses the v8 sample credentials and documents the connection", () => {
    const config = parse(readProjectFile("docker/cpa/config.yaml"));
    const readme = readProjectFile("README.md");

    expect(config.server.port).toBe(8317);
    expect(config.management).toMatchObject({ "allow-remote": true, "secret-key": "1" });
    expect(config.access["api-keys"]).toEqual(["1"]);
    expect(readme).toContain("http://localhost:18080");
    expect(readme).toContain("http://localhost:18317");
    expect(readme).toContain("Management key: `1`");
    expect(readme).toContain("Client key: `1`");
  });
});
