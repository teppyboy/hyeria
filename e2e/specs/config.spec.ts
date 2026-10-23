import { expect, test } from "@playwright/test";
import process from "node:process";

test("edits YAML through the redacted diff confirmation", async ({ page }, testInfo) => {
  const managementBuild = testInfo.project.name === "management-hash";
  await page.goto(managementBuild ? "/management.html#/login" : "/login");
  await page.getByLabel("API address").fill(process.env.E2E_API_BASE ?? "http://127.0.0.1:8327");
  await page
    .getByRole("textbox", { name: "Management key" })
    .fill(process.env.E2E_MANAGEMENT_KEY ?? "e2e-management-key");
  await page.getByRole("button", { name: "Connect" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.getByRole("link", { name: "Configuration" }).click();
  const editor = page.locator(".cm-content");
  await expect(editor).toBeVisible();
  const originalYaml = await editor.innerText();
  const currentLogging = originalYaml.match(/logging-to-file: (true|false)/)?.[1];
  expect(currentLogging).toBeDefined();
  const updatedLogging = currentLogging === "true" ? "false" : "true";
  const updatedYaml = originalYaml.replace(
    `logging-to-file: ${currentLogging}`,
    `logging-to-file: ${updatedLogging}`,
  );
  await editor.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(updatedYaml);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /save|confirm/i })
    .click();
  await expect(page.getByRole("status")).toContainText("saved");
  const response = await page.request.get(
    `${process.env.E2E_API_BASE ?? "http://127.0.0.1:8327"}/v8/management/config.yaml`,
    {
      headers: {
        Authorization: `Bearer ${process.env.E2E_MANAGEMENT_KEY ?? "e2e-management-key"}`,
      },
    },
  );
  expect(response.ok()).toBeTruthy();
  expect(await response.text()).toContain(`logging-to-file: ${updatedLogging}`);
});
