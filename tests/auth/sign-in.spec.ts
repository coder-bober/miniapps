import { expect, test } from "@playwright/test";

import { getAuthFixtures, signInWithPassword, signOutFromUserMenu } from "./helpers";
import { confirmUserEmail, hasSupabaseAdminEnv } from "../utils/supabase-admin";

test.describe("auth sign-in", () => {
  test.skip(!hasSupabaseAdminEnv(), "Supabase admin test env is not configured.");

  test("confirmed user can sign in and sign out", async ({ page }) => {
    const fixtures = await getAuthFixtures();

    await signInWithPassword(page, {
      email: fixtures.confirmedUser.email,
      password: fixtures.confirmedUser.password,
    });

    await expect(page).toHaveURL(/\/en\/workspace$/);

    await signOutFromUserMenu(page);

    await expect(page).toHaveURL(/\/en$/);
  });

  test("confirmed user can sign in on the Russian locale", async ({ page }) => {
    const fixtures = await getAuthFixtures();

    await signInWithPassword(page, {
      locale: "ru",
      email: fixtures.confirmedUser.email,
      password: fixtures.confirmedUser.password,
      passwordLabel: "Пароль",
      submitButtonName: /^войти$/i,
    });

    await expect(page).toHaveURL(/\/ru\/workspace$/);
  });

  test("unconfirmed user gets a confirmation error", async ({ page }) => {
    const fixtures = await getAuthFixtures();

    await signInWithPassword(page, {
      email: fixtures.unconfirmedUser.email,
      password: fixtures.unconfirmedUser.password,
    });

    await expect(page).toHaveURL(/\/en\/sign-in\?/);
    await expect(page.getByText(/not confirmed yet/i)).toBeVisible();
  });

  test("admin-confirmed user can sign in after being blocked while unconfirmed", async ({ page }) => {
    const fixtures = await getAuthFixtures();

    await signInWithPassword(page, {
      email: fixtures.unconfirmedUser.email,
      password: fixtures.unconfirmedUser.password,
    });

    await expect(page).toHaveURL(/\/en\/sign-in\?/);
    await expect(page.getByText(/not confirmed yet/i)).toBeVisible();

    await confirmUserEmail(fixtures.unconfirmedUser.id);

    await signInWithPassword(page, {
      email: fixtures.unconfirmedUser.email,
      password: fixtures.unconfirmedUser.password,
    });

    await expect(page).toHaveURL(/\/en\/workspace$/);
  });
});
