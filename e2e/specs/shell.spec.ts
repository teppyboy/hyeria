import { expect, test, type Page } from "@playwright/test";
import process from "node:process";

async function connect(page: Page) {
  await page.goto("/management.html#/login");
  await page.getByLabel("API address").fill(process.env.E2E_API_BASE ?? "http://127.0.0.1:8327");
  await page
    .getByRole("textbox", { name: "Management key" })
    .fill(process.env.E2E_MANAGEMENT_KEY ?? "e2e-management-key");
  await page.getByRole("button", { name: "Connect" }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test("captures desktop shell rail states and the mobile navigation", async ({ page }) => {
  await connect(page);
  await expect(page.locator('[data-slot="connection-status"]')).toHaveText("Connected session");
  await page.screenshot({ path: "test-results/shell-desktop-expanded.png", fullPage: true });

  await page.getByRole("button", { name: "Toggle sidebar" }).click();
  await expect(page.locator("aside#app-navigation")).toHaveClass(/sidebar-collapsed/);
  await expect(page.locator("aside#app-navigation a[title=Dashboard]")).toBeVisible();
  await page.screenshot({ path: "test-results/shell-desktop-collapsed.png", fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
  await page.screenshot({ path: "test-results/shell-mobile.png", fullPage: true });
});
