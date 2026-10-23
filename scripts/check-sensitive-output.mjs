import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const roots = process.argv.slice(2);
if (roots.length === 0) throw new Error("Pass one or more output directories to scan.");
const patterns = [
  /sk-live-[A-Za-z0-9_-]{12,}/,
  /sk-test-[A-Za-z0-9_-]{12,}/,
  /Bearer [A-Za-z0-9._~+/=-]{16,}/i,
  /management[_-]?key["']?\s*:\s*["'][^"']{8,}/i,
];
async function scan(path) {
  const entries = await readdir(path, { withFileTypes: true });
  for (const entry of entries) {
    const file = join(path, entry.name);
    if (entry.isDirectory()) await scan(file);
    else {
      const content = await readFile(file, "utf8");
      if (patterns.some((pattern) => pattern.test(content)))
        throw new Error(`Potential credential marker in ${file}`);
    }
  }
}
for (const root of roots) await scan(root);
console.log(`Sensitive-output scan passed for: ${roots.join(", ")}`);
