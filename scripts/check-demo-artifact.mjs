import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const [directory] = process.argv.slice(2);
if (!directory) throw new Error("Pass the demo output directory to scan.");

const root = resolve(directory);
const htmlPath = join(root, "index.html");
const forbidden = [
  /sk-(?:live|test)-[A-Za-z0-9_-]{12,}/i,
  /Bearer\s+[A-Za-z0-9._~+/=-]{16,}/i,
  /(?:management[_-]?key|apiBase|api[_-]?base)\s*[:=]\s*["'][^"']+/i,
  /\$\{GITHUB_REPOSITORY\b/,
  /(?:https?:\/\/[^"'\s<]*)?\/v8\/management(?:[/?#"'\s<]|$)/i,
  /(?:^|[/\\])dist(?:-management|-static)?[/\\]/i,
];

async function filesIn(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesIn(path)));
    else files.push(path);
  }
  return files;
}

const files = await filesIn(root);
if (!files.includes(htmlPath))
  throw new Error(`Demo artifact must contain exactly one ${htmlPath}.`);
const unexpected = files.filter((path) => path.endsWith("/index.html") && path !== htmlPath);
if (unexpected.length > 0)
  throw new Error(`Unexpected demo HTML artifacts: ${unexpected.join(", ")}`);
for (const file of files) {
  const content = await readFile(file, "utf8");
  const match = forbidden.find((pattern) => pattern.test(content));
  if (match) throw new Error(`Demo artifact contains forbidden content in ${file}.`);
}

const html = await readFile(htmlPath, "utf8");
if (!/<script\b[^>]*src=/i.test(html)) throw new Error("Demo artifact has no application script.");
console.log(`Demo artifact scan passed: ${htmlPath}`);
