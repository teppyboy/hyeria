import { expect, test } from "@playwright/test";
import process from "node:process";

test("single-file management entry uses hash routes", async ({ page }) => {
  await page.goto("/management.html#/login");
  await expect(
    page.getByRole("heading", { name: "Connect to your CLI Proxy API server" }),
  ).toBeVisible();
  await page.getByLabel("API address").fill(process.env.E2E_API_BASE ?? "http://127.0.0.1:8327");
  await page
    .getByRole("textbox", { name: "Management key" })
    .fill(process.env.E2E_MANAGEMENT_KEY ?? "e2e-management-key");
  await page.getByRole("button", { name: "Connect" }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
