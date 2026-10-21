import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vite-plus/test";

const root = resolve(import.meta.dirname, "../..");
const outRoot = join(root, "node_modules/.tmp/build-artifacts");
const staticDir = join(outRoot, "dist");
const managementDir = join(outRoot, "dist-management");

function build(args: string[]) {
  execFileSync(join(root, "node_modules/.bin/vp"), ["build", ...args], {
    cwd: root,
    stdio: "pipe",
  });
}

beforeAll(() => {
  rmSync(outRoot, { recursive: true, force: true });
  mkdirSync(outRoot, { recursive: true });
  build(["--outDir", staticDir]);
  build(["--mode", "management", "--outDir", managementDir]);
}, 240_000);

describe("management build", () => {
  it("emits a single self-contained management.html", () => {
    expect(readdirSync(managementDir)).toEqual(["management.html"]);
    const html = readFileSync(join(managementDir, "management.html"), "utf8");
    expect(html).toContain("CLI Proxy API management center");
    // Inline script/style bodies contain library strings that look like tags; check markup only.
    const markup = html
      .replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi, "$1</script>")
      .replace(/(<style\b[^>]*>)[\s\S]*?<\/style>/gi, "$1</style>");
    expect(markup).not.toMatch(/<script[^>]*\ssrc=/i);
    expect(markup).not.toMatch(/<link[^>]*rel=["']?(stylesheet|modulepreload)/i);
    expect(markup).not.toMatch(/(?:src|href)=["']?(?:https?:)?\/\//i);
    expect(markup).not.toMatch(/(?:src|href)=["']?\/?assets\//i);
  });
});

describe("normal static build", () => {
  it("emits index.html referencing hashed assets", () => {
    const html = readFileSync(join(staticDir, "index.html"), "utf8");
    expect(html).toMatch(/<script[^>]*src="\/assets\/[^"]+\.js"/);
    expect(existsSync(join(staticDir, "management.html"))).toBe(false);
    expect(readdirSync(join(staticDir, "assets")).some((f) => f.endsWith(".js"))).toBe(true);
  });
});
