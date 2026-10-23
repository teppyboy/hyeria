import { expect, test } from "@playwright/test";

test("renders the isolated interactive demo and resets on reload", async ({ page }) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith(page.url().split("/").slice(0, 3).join("/"))) {
      externalRequests.push(request.url());
    }
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText(/interactive demo/i)).toBeVisible();
  await page.getByRole("link", { name: "Configuration" }).click();
  await expect(page.getByRole("heading", { name: "Config" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Config" })).toBeVisible();
  await expect(page.getByText(/interactive demo/i)).toBeVisible();
  expect(externalRequests).toEqual([]);
});
