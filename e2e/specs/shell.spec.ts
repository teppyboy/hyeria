import { expect, test, type Page } from "@playwright/test";
import process from "node:process";

async function readRailState(page: Page) {
  return page.locator("aside#app-navigation").evaluate((rail) => {
    const label = rail.querySelector(".sidebar-label");
    const labelStyle = label ? label.ownerDocument.defaultView?.getComputedStyle(label) : undefined;
    return {
      width: rail.getBoundingClientRect().width,
      labelDisplay: labelStyle?.display,
      labelOpacity: Number(labelStyle?.opacity),
      labelVisible: labelStyle?.display !== "none" && Number(labelStyle?.opacity) > 0,
    };
  });
}

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
  await page.emulateMedia({ reducedMotion: "reduce" });
  await connect(page);
  await expect(page.locator('[data-slot="connection-status"]')).toHaveText("Connected session");
  await page.screenshot({ path: "test-results/shell-desktop-expanded.png", fullPage: true });

  const rail = page.locator("aside#app-navigation");
  await page.getByRole("button", { name: "Toggle sidebar" }).click();
  await expect(rail).toHaveClass(/sidebar-collapsed/);
  await expect(page.locator("aside#app-navigation a[title=Dashboard]")).toBeVisible();
  const collapsedState = await readRailState(page);
  expect(collapsedState.width).toBeLessThan(100);
  expect(collapsedState.labelDisplay).toBe("none");
  expect(collapsedState.labelVisible).toBe(false);
  await page.screenshot({ path: "test-results/shell-desktop-collapsed.png", fullPage: true });

  await rail.hover();
  await expect.poll(async () => (await readRailState(page)).width).toBeGreaterThan(200);
  await expect.poll(async () => (await readRailState(page)).labelDisplay).not.toBe("none");
  await expect.poll(async () => (await readRailState(page)).labelOpacity).toBeGreaterThan(0.5);
  const hoveredState = await readRailState(page);
  expect(hoveredState.width).toBeGreaterThan(collapsedState.width);
  expect(hoveredState.labelVisible).toBe(true);

  await page.mouse.move(500, 200);
  await expect.poll(async () => (await readRailState(page)).width).toBeLessThan(100);
  await rail.getByRole("link", { name: "Dashboard" }).focus();
  await expect.poll(async () => (await readRailState(page)).width).toBeGreaterThan(200);
  await expect.poll(async () => (await readRailState(page)).labelDisplay).not.toBe("none");
  await expect.poll(async () => (await readRailState(page)).labelOpacity).toBeGreaterThan(0.5);
  const focusedState = await readRailState(page);
  expect(focusedState.width).toBeGreaterThan(collapsedState.width);
  expect(focusedState.labelVisible).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
  await page.screenshot({ path: "test-results/shell-mobile.png", fullPage: true });
});
