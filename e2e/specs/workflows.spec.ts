import { expect, test } from "@playwright/test";
import process from "node:process";

test("opens auth files and quota pages", async ({ page }, testInfo) => {
  await connect(page, testInfo.project.name === "management-hash");
  await page.getByRole("link", { name: "Auth files" }).click();
  await expect(page.getByRole("heading", { name: "Auth files" })).toBeVisible();
  await page.getByRole("link", { name: "Quota" }).click();
  await expect(page.getByRole("heading", { name: "Quota" })).toBeVisible();
});

test("cancels an OAuth flow with a mocked provider response", async ({ page }, testInfo) => {
  await page.route("**/v8/management/oauth/auth-url**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "ok",
        url: "https://example.invalid/oauth",
        state: "e2e-oauth-state",
      }),
    }),
  );
  await page.route("**/v8/management/oauth/status**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "wait" }),
    }),
  );
  await page.route("**/v8/management/oauth/session**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok" }),
    }),
  );
  await connect(page, testInfo.project.name === "management-hash");
  await page.getByRole("link", { name: "OAuth" }).click();
  await expect(page.getByRole("heading", { name: "OAuth" })).toBeVisible();
  await page.getByRole("button", { name: "Start OAuth" }).click();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("status")).toContainText("cancelled");
  await expect(page).not.toHaveURL(/e2e-oauth-state/);
});

async function connect(page: import("@playwright/test").Page, managementBuild = false) {
  await page.goto(managementBuild ? "/management.html#/login" : "/login");
  await page.getByLabel("API address").fill(process.env.E2E_API_BASE ?? "http://127.0.0.1:8327");
  await page
    .getByRole("textbox", { name: "Management key" })
    .fill(process.env.E2E_MANAGEMENT_KEY ?? "e2e-management-key");
  await page.getByRole("button", { name: "Connect" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}
