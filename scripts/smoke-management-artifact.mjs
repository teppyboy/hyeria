import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const file = resolve("dist-management/management.html");
const [html, info] = await Promise.all([readFile(file, "utf8"), stat(file)]);
if (info.size < 100_000) throw new Error("management.html is unexpectedly small");
if (!html.includes("Hyeria") || !html.includes("CLI Proxy API management center")) {
  throw new Error("management.html is missing expected application branding");
}
const markup = html
  .replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi, "$1</script>")
  .replace(/(<style\b[^>]*>)[\s\S]*?<\/style>/gi, "$1</style>");
if (!/<script\b[^>]*>/.test(markup) || /<script\b[^>]*\bsrc=/i.test(markup)) {
  throw new Error(
    "management.html must include an inline application script and no external script",
  );
}
if (/<link\b[^>]*\brel=["']?stylesheet[^>]*\bhref=/i.test(markup)) {
  throw new Error("management.html must not load an external stylesheet");
}
if (
  /(?:src|href)=["']?(?:https?:)?\/\//i.test(markup) ||
  /(?:src|href)=["']?\/?assets\//i.test(markup)
) {
  throw new Error("management.html must not reference external runtime assets");
}
console.log(`management artifact smoke check passed (${info.size} bytes)`);
