import { defineConfig, devices } from "@playwright/test";
import process from "node:process";

const host = process.env.E2E_HOST ?? "127.0.0.1";
const staticBaseURL = process.env.E2E_APP_URL ?? `http://${host}:5173`;
const managementBaseURL = process.env.E2E_MANAGEMENT_URL ?? `http://${host}:4173`;
const demoBaseURL = process.env.E2E_DEMO_URL ?? `http://${host}:4174/`;

export default defineConfig({
  testDir: "./e2e/specs",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: staticBaseURL,
    browserName: "chromium",
    headless: true,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "demo",
      testMatch: /demo\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: demoBaseURL },
    },
    {
      name: "static-history",
      testMatch: /(auth|config|workflows)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "management-hash",
      testMatch: /management\.spec\.ts|shell\.spec\.ts|config\.spec\.ts|workflows\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: managementBaseURL },
    },
  ],
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  webServer: [
    {
      command: "vp preview --host 127.0.0.1 --port 4174 --outDir dist-demo",
      url: demoBaseURL,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "vp dev --host 127.0.0.1",
      url: staticBaseURL,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "vp preview --host 127.0.0.1 --port 4173 --outDir dist-management",
      url: `${managementBaseURL}/management.html`,
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
