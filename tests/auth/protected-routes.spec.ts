import { expect, test } from "@playwright/test";

test.describe("protected routes", () => {
  test("signed-out users are redirected to English sign-in", async ({ page }) => {
    await page.goto("/en/workspace");

    await expect(page).toHaveURL(/\/en\/sign-in$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/sign in/i);
  });

  test("signed-out users are redirected to Russian sign-in", async ({ page }) => {
    await page.goto("/ru/workspace");

    await expect(page).toHaveURL(/\/ru\/sign-in$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/вход/i);
  });
});
