import {
  ensureAuthFixtureWorkspaceMemberships,
  readAuthFixtureState,
  hasSupabaseAdminEnv,
} from "../utils/supabase-admin";
import type { Page } from "@playwright/test";

export async function getAuthFixtures() {
  if (!hasSupabaseAdminEnv()) {
    throw new Error("Supabase admin env is not configured for auth fixtures.");
  }

  try {
    return await ensureAuthFixtureWorkspaceMemberships(await readAuthFixtureState());
  } catch (error) {
    throw new Error(
      `Auth fixtures are unavailable. Global setup likely failed to seed them: ${String(error)}`,
    );
  }
}

export async function signInWithPassword(
  page: Page,
  {
    locale = "en",
    email,
    password,
    emailLabel = "Email",
    passwordLabel = "Password",
    submitButtonName = /^sign in$/i,
    maxAttempts = 3,
  }: {
    locale?: string;
    email: string;
    password: string;
    emailLabel?: string;
    passwordLabel?: string;
    submitButtonName?: string | RegExp;
    maxAttempts?: number;
  },
) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    await page.goto(`/${locale}/sign-in`);
    await page.getByLabel(emailLabel).fill(email);
    await page.getByLabel(passwordLabel).fill(password);
    await page.getByRole("button", { name: submitButtonName }).click();
    await Promise.race([
      page.waitForURL(new RegExp(`/${locale}/workspace$`), {
        timeout: 10000,
        waitUntil: "commit",
      }),
      page.waitForURL(new RegExp(`/${locale}/sign-in\\?`), {
        timeout: 10000,
        waitUntil: "commit",
      }),
    ]);
    await page.waitForLoadState("domcontentloaded");

    if (page.url().match(new RegExp(`/${locale}/workspace$`))) {
      return;
    }

    if (!page.url().includes("error=fetch%20failed")) {
      return;
    }

    if (attempt === maxAttempts) {
      throw new Error(`Sign-in failed after ${maxAttempts} attempts due to upstream fetch failures.`);
    }
  }
}

export async function signOutFromUserMenu(page: Page) {
  await page.getByLabel("Open user menu").click();
  await page.getByRole("menuitem", { name: /sign out/i }).click();
  await page.waitForLoadState("domcontentloaded");
}
