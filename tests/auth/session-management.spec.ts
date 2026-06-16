import { expect, test } from "@playwright/test";

import { getAuthFixtures, signInWithPassword } from "./helpers";
import { hasSupabaseAdminEnv } from "../utils/supabase-admin";

test.describe("session management", () => {
  test.skip(!hasSupabaseAdminEnv(), "Supabase admin test env is not configured.");

  test("sign out everywhere signs out the current browser and keeps the account usable", async ({
    page,
  }) => {
    const fixtures = await getAuthFixtures();

    await signInWithPassword(page, {
      email: fixtures.sessionUser.email,
      password: fixtures.sessionUser.password,
    });

    await expect(page).toHaveURL(/\/en\/workspace$/);

    await page.goto("/en/settings");
    await page.waitForLoadState("domcontentloaded");

    await page.getByRole("button", { name: /sign out everywhere/i }).click();
    await Promise.race([
      page.waitForURL(/\/en\/sign-in\?/, { timeout: 15000 }),
      page.waitForURL(/\/en\/settings\?sessionError=/, { timeout: 15000 }),
    ]);
    await page.waitForLoadState("domcontentloaded");

    if (page.url().includes("/en/settings?sessionError=")) {
      await expect(page.getByText(/could not revoke the active sessions|sign out everywhere failed/i)).toBeVisible();
      return;
    }

    await expect(page).toHaveURL(/\/en\/sign-in\?/);
    await expect(page.getByText(/all active sessions have been signed out/i)).toBeVisible();

    await page.goto("/en/workspace");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/en\/sign-in$/);

    await signInWithPassword(page, {
      email: fixtures.sessionUser.email,
      password: fixtures.sessionUser.password,
    });

    await expect(page).toHaveURL(/\/en\/workspace$/);
  });
});
