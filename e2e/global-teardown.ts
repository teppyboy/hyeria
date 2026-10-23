import { execFileSync } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(".");
const compose = ["compose", "-p", "hyeria-e2e", "-f", "e2e/compose.yaml"];

export default async function globalTeardown() {
  if (process.env.E2E_API_DOCKER === "1") {
    execFileSync(
      "docker",
      [
        ...compose,
        "--env-file",
        "e2e/.compose.env",
        "down",
        "-v",
        "--rmi",
        "local",
        "--remove-orphans",
      ],
      {
        cwd: root,
        stdio: "inherit",
      },
    );
    await rm(join(root, "e2e/.compose.env"), { force: true });
    await rm(join(root, "node_modules/.tmp/hyeria-e2e-config.yaml"), { force: true });
    return;
  }
  const pidFile = join(root, "node_modules/.tmp/hyeria-e2e-mock.pid");
  try {
    const pid = Number(await readFile(pidFile, "utf8"));
    if (Number.isInteger(pid) && pid > 1) process.kill(pid);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  await rm(pidFile, { force: true });
}
