import { expect, test } from "@playwright/test";

import { attachBrowserErrorCapture } from "./utils/browser-errors";

test.skip(
  process.env.ENABLED_MODULES === undefined || process.env.ENABLED_MODULES.includes("module-lab"),
  "module-lab disabled smoke test runs only in a suite that explicitly disables module-lab.",
);

test("homepage loads without browser errors when module-lab is disabled", async ({ page }) => {
  const { pageErrors, consoleErrors, failedRequests } = attachBrowserErrorCapture(page);

  const response = await page.goto("/en");
  await page.waitForLoadState("networkidle");

  expect(response?.ok()).toBeTruthy();
  await expect(page).toHaveTitle(/QuietShift/i);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /module lab/i })).toHaveCount(0);

  expect(pageErrors, `Page errors:\n${pageErrors.join("\n")}`).toEqual([]);
  expect(consoleErrors, `Console errors:\n${consoleErrors.join("\n")}`).toEqual([]);
  expect(failedRequests, `Failed requests:\n${failedRequests.join("\n")}`).toEqual([]);
});
