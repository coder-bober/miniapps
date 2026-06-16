import { expect, test } from "@playwright/test";

import { getAuthFixtures, signInWithPassword, signOutFromUserMenu } from "./helpers";
import { hasSupabaseAdminEnv } from "../utils/supabase-admin";

test.describe("account settings", () => {
  test.skip(!hasSupabaseAdminEnv(), "Supabase admin test env is not configured.");

  test("authenticated user can change password from settings", async ({ page }) => {
    const fixtures = await getAuthFixtures();

    const newPassword = `${fixtures.settingsUser.password}-updated`;

    await signInWithPassword(page, {
      email: fixtures.settingsUser.email,
      password: fixtures.settingsUser.password,
    });

    await expect(page).toHaveURL(/\/en\/workspace$/);

    await page.goto("/en/settings");
    await page.waitForLoadState("networkidle");

    await page.getByRole("textbox", { name: /^new password$/i }).fill(newPassword);
    await page.getByRole("textbox", { name: /^confirm new password$/i }).fill(newPassword);
    await page.getByRole("button", { name: /save new password/i }).click();
    await Promise.race([
      page.waitForURL(/\/en\/settings\?passwordMessage=/, { timeout: 15000 }),
      page.waitForURL(/\/en\/settings\?passwordError=/, { timeout: 15000 }),
    ]);
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(/\/en\/settings\?passwordMessage=/);
    await expect(page.getByText(/password has been updated/i)).toBeVisible();

    await signOutFromUserMenu(page);

    await signInWithPassword(page, {
      email: fixtures.settingsUser.email,
      password: newPassword,
    });

    await expect(page).toHaveURL(/\/en\/workspace$/);
  });
});
