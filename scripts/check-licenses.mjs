import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(".");
let pkg;
try {
  pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
} catch (error) {
  throw new Error("Unable to read package.json license metadata", { cause: error });
}
const notice = await readFile(join(root, "NOTICE"), "utf8");
await readFile(join(root, "LICENSE"));
if (pkg.license !== "AGPL-3.0-only") throw new Error("Expected AGPL-3.0-only license");

const directDependencies = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
];
for (const name of directDependencies) {
  let license;
  let dir = join(root, "node_modules", name);
  while (dir !== root && dir !== resolve(dir, "..")) {
    try {
      const candidate = JSON.parse(await readFile(join(dir, "package.json"), "utf8"));
      if (
        candidate.name === name ||
        (name === "vite" && candidate.name === "@voidzero-dev/vite-plus-core")
      ) {
        license = candidate.license;
        break;
      }
    } catch {
      // Keep walking: workspace package managers may use scoped symlink layouts.
    }
    dir = resolve(dir, "..");
  }
  if (!license) throw new Error(`Could not read license metadata for direct dependency ${name}`);
  if (!notice.includes(name))
    throw new Error(`NOTICE does not list direct dependency ${name} (${license})`);
}
console.log(`License check passed for ${directDependencies.length} direct dependencies`);
