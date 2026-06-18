import { expect, test } from "@playwright/test";
import { attachBrowserErrorCapture } from "./utils/browser-errors";

test("homepage loads without page errors", async ({ page }) => {
  const { pageErrors, consoleErrors, failedRequests } = attachBrowserErrorCapture(page);

  const response = await page.goto("/en");

  expect(response?.ok()).toBeTruthy();
  await expect(page).toHaveTitle(/QuietShift/i);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  expect(pageErrors, `Page errors:\n${pageErrors.join("\n")}`).toEqual([]);
  expect(consoleErrors, `Console errors:\n${consoleErrors.join("\n")}`).toEqual([]);
  expect(failedRequests, `Failed requests:\n${failedRequests.join("\n")}`).toEqual([]);
});

test("auth recovery pages load without page errors", async ({ page }) => {
  const { pageErrors, consoleErrors, failedRequests } = attachBrowserErrorCapture(page);

  await page.goto("/en/sign-in");
  await expect(page.getByRole("link", { name: /forgot password/i })).toBeVisible();
  await page.getByRole("link", { name: /forgot password/i }).click();

  await expect(page).toHaveURL(/\/en\/forgot-password$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/reset your password/i);

  await page.goto("/en/reset-password");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/choose a new password/i);

  expect(pageErrors, `Page errors:\n${pageErrors.join("\n")}`).toEqual([]);
  expect(consoleErrors, `Console errors:\n${consoleErrors.join("\n")}`).toEqual([]);
  expect(failedRequests, `Failed requests:\n${failedRequests.join("\n")}`).toEqual([]);
});
