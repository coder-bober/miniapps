import { expect, test } from "@playwright/test";

import { getAuthFixtures, signInWithPassword } from "./helpers";
import {
  findUserByEmail,
  getProfileById,
  hasSupabaseAdminEnv,
} from "../utils/supabase-admin";

test.describe("account deletion", () => {
  test.skip(!hasSupabaseAdminEnv(), "Supabase admin test env is not configured.");

  test("deletion requires exact email confirmation and preserves the account on failure", async ({
    page,
  }) => {
    const fixtures = await getAuthFixtures();

    await signInWithPassword(page, {
      email: fixtures.deletionValidationUser.email,
      password: fixtures.deletionValidationUser.password,
    });

    await expect(page).toHaveURL(/\/en\/workspace$/);

    await page.goto("/en/settings");
    await expect(page.getByLabel("Confirm with your account email")).toBeVisible();

    await page.getByLabel("Confirm with your account email").fill("wrong@example.com");
    await page.getByRole("button", { name: /^delete account$/i }).click();

    await expect(page).toHaveURL(/\/en\/settings\?/);
    await expect(page.getByText(/enter your account email exactly/i)).toBeVisible();

    const authUser = await findUserByEmail(fixtures.deletionValidationUser.email);
    expect(authUser?.id).toBe(fixtures.deletionValidationUser.id);

    const profile = await getProfileById(fixtures.deletionValidationUser.id);
    expect(profile?.id).toBe(fixtures.deletionValidationUser.id);

    await page.goto("/en/workspace");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/en\/workspace$/);
  });

  test("authenticated user can delete the account from settings and loses access afterward", async ({
    page,
  }) => {
    const fixtures = await getAuthFixtures();

    await signInWithPassword(page, {
      email: fixtures.deletionUser.email,
      password: fixtures.deletionUser.password,
    });

    await expect(page).toHaveURL(/\/en\/workspace$/);

    await page.goto("/en/settings");
    await expect(page.getByLabel("Confirm with your account email")).toBeVisible();

    await page
      .getByLabel("Confirm with your account email")
      .fill(fixtures.deletionUser.email);
    await page.getByRole("button", { name: /^delete account$/i }).click();
    await Promise.race([
      page.waitForURL(/\/en\/sign-in\?message=/, { timeout: 15000 }),
      page.waitForURL(/\/en\/settings\?deleteError=/, { timeout: 15000 }),
    ]);
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(/\/en\/sign-in\?message=/);
    await expect(page.getByText(/account has been deleted/i)).toBeVisible();

    const authUser = await findUserByEmail(fixtures.deletionUser.email);
    expect(authUser).toBeNull();

    const profile = await getProfileById(fixtures.deletionUser.id);
    expect(profile).toBeNull();

    await page.goto("/en/workspace");
    await expect(page).toHaveURL(/\/en\/sign-in$/);

    await page.goto("/en/sign-in");
    await expect(page.getByLabel("Email")).toBeVisible();
    await page.getByLabel("Email").fill(fixtures.deletionUser.email);
    await page.getByLabel("Password").fill(fixtures.deletionUser.password);
    await page.getByRole("button", { name: /^sign in$/i }).click();

    await expect(page).toHaveURL(/\/en\/sign-in\?/);
    await expect(page.getByText(/invalid login credentials/i)).toBeVisible();
  });
});
