import { expect, test } from "@playwright/test";

import { getAuthFixtures, signInWithPassword } from "./helpers";
import { hasSupabaseAdminEnv } from "../utils/supabase-admin";

test.describe("profile", () => {
  test.skip(!hasSupabaseAdminEnv(), "Supabase admin test env is not configured.");

  test("confirmed user can update profile details", async ({ page }) => {
    const fixtures = await getAuthFixtures();
    const uniqueUsername = `e2e_updated_${Date.now().toString(36)}`;

    await signInWithPassword(page, {
      email: fixtures.confirmedUser.email,
      password: fixtures.confirmedUser.password,
    });
    await expect(page).toHaveURL(/\/en\/workspace$/);

    await page.goto("/en/profile");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/en\/profile/);

    await page.getByLabel("Full name").fill("E2E Updated User");
    await page.getByLabel("Username").fill(uniqueUsername);
    await page.getByRole("button", { name: /save profile/i }).click();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/en\/profile\?message=/);
    await expect(page.getByRole("alert").filter({ hasText: /profile changes saved/i })).toBeVisible();
    await expect(page.getByLabel("Full name")).toHaveValue("E2E Updated User");
    await expect(page.getByLabel("Username")).toHaveValue(uniqueUsername);
  });
});
