import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vite-plus/test";

const exec = promisify(execFile);
const root = resolve(import.meta.dirname, "../../..");

async function scan(content: string) {
  const directory = await mkdtemp(join(tmpdir(), "hyeria-demo-"));
  await writeFile(join(directory, "index.html"), content);
  return exec(process.execPath, ["scripts/check-demo-artifact.mjs", directory], { cwd: root });
}

describe("demo build safeguards", () => {
  it("rejects credential sentinels and management endpoints", async () => {
    await expect(scan('<script src="app.js">sk-live-abcdefghijklmnop</script>')).rejects.toThrow();
    await expect(scan('<script src="app.js">/v8/management/config</script>')).rejects.toThrow();
  });

  it("rejects an unexpanded GitHub repository path in asset URLs", async () => {
    await expect(
      scan('<script src="/${GITHUB_REPOSITORY/assets/app.js"></script>'),
    ).rejects.toThrow();
  });

  it("accepts a regular application artifact", async () => {
    await expect(
      scan('<script type="module" src="/assets/app.js"></script>'),
    ).resolves.toBeDefined();
  });

  it("selects the demo entry in the dedicated Vite config", async () => {
    const config = await readFile(join(root, "vite.config.demo.ts"), "utf8");
    expect(config).toContain("/src/app/entry/demo.tsx");
    expect(config).toContain('process.env.DEMO_BASE ?? "/"');
  });
});
