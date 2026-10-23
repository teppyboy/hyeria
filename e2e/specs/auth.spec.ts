import { expect, test } from "@playwright/test";
import process from "node:process";

const apiBase = process.env.E2E_API_BASE ?? "http://127.0.0.1:8327";
const managementKey = process.env.E2E_MANAGEMENT_KEY ?? "e2e-management-key";

test("protects routes, connects to v8 and disconnects without persisting the key", async ({
  page,
}) => {
  await page.goto("/logs");
  await expect(page).toHaveURL(/\/login/);
  await connect(page, "Logs");
  await expect(page.getByRole("heading", { name: "Logs" })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Search logs" })).toBeVisible();
  await expect(page).not.toHaveURL(/e2e-management-key/);
  await page.getByRole("button", { name: "Disconnect" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Disconnect" }).click();
  await expect(page.getByRole("textbox", { name: "Management key" })).toBeVisible();
  expect(JSON.stringify(await page.evaluate(() => localStorage))).not.toContain(managementKey);
});

test("renders dashboard and navigates to config and plugins", async ({ page }) => {
  await connect(page);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.getByRole("link", { name: "Configuration" }).click();
  await expect(page.getByRole("heading", { name: "Config" })).toBeVisible();
  await page.getByRole("link", { name: "Plugins" }).click();
  await expect(page.getByRole("heading", { name: "Plugins" })).toBeVisible();
});

async function connect(page: import("@playwright/test").Page, landingHeading = "Dashboard") {
  await page.goto("/login");
  await page.getByLabel("API address").fill(apiBase);
  await page.getByRole("textbox", { name: "Management key" }).fill(managementKey);
  await page.getByRole("button", { name: "Connect" }).click();
  await expect(page.getByRole("heading", { name: landingHeading })).toBeVisible();
}
