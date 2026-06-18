import { expect, test } from "@playwright/test";

import { getAuthFixtures, signInWithPassword } from "./helpers";
import {
  generatePasswordRecoveryLink,
  hasSupabaseAdminEnv,
} from "../utils/supabase-admin";

test.describe("password reset", () => {
  test.skip(!hasSupabaseAdminEnv(), "Supabase admin test env is not configured.");

  test("confirmed user can reset password from an admin-generated recovery link", async ({
    page,
  }) => {
    const fixtures = await getAuthFixtures();

    const newPassword = `${fixtures.resetUser.password}_reset`;
    const recoveryLink = await generatePasswordRecoveryLink(fixtures.resetUser.email, "en");

    await page.goto(recoveryLink);

    await expect(page).toHaveURL(/\/en\/reset-password/);
    await expect(page.getByLabel("New password")).toBeVisible();
    await page.getByLabel("New password").fill(newPassword);
    await page.getByRole("button", { name: /update password/i }).click();

    await expect
      .poll(() => page.url())
      .toMatch(/\/en\/(sign-in\?|workspace$)/);

    await page.context().clearCookies();
    await signInWithPassword(page, {
      email: fixtures.resetUser.email,
      password: newPassword,
    });

    await expect(page).toHaveURL(/\/en\/workspace$/);
  });
});
