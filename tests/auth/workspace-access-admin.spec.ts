import { expect, test, type Locator, type Page } from "@playwright/test";

import { getAuthFixtures, signInWithPassword } from "./helpers";
import { hasSupabaseAdminEnv } from "../utils/supabase-admin";

function isModuleEnabledForSuite(moduleId: string) {
  const enabledModules = process.env.ENABLED_MODULES;

  if (enabledModules === undefined) {
    return true;
  }

  if (!enabledModules.trim()) {
    return false;
  }

  return enabledModules
    .split(",")
    .map((enabledModuleId) => enabledModuleId.trim())
    .filter(Boolean)
    .includes(moduleId);
}

async function chooseSelectOption(locator: Locator, optionName: string | RegExp) {
  await expect(locator).toBeVisible({ timeout: 10000 });
  await locator.click();
  await locator.page().getByRole("option", { name: optionName }).click();
}

async function chooseWorkspace(page: Page, label: string) {
  await chooseSelectOption(page.getByRole("textbox", { name: "Workspace" }), label);
  await expect(page.getByRole("textbox", { name: "Workspace" })).toHaveValue(label, {
    timeout: 10000,
  });
}

test.describe("workspace access administration", () => {
  test.skip(!hasSupabaseAdminEnv(), "Supabase admin test env is not configured.");

  test("normal user sees workspace overview without app-admin tools", async ({ page }) => {
    const fixtures = await getAuthFixtures();

    await signInWithPassword(page, {
      locale: "en",
      email: fixtures.workspaceUser.email,
      password: fixtures.workspaceUser.password,
    });

    await expect(page).toHaveURL(/\/en\/workspace$/);
    await expect(page.getByRole("heading", { name: "Workspace access" })).toBeVisible();
    await expect(page.getByText(fixtures.workspaceShared.name, { exact: true })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole("heading", { name: "Admin testing tools" })).toHaveCount(0);

    const sharedWorkspaceRow = page.getByRole("row").filter({
      hasText: fixtures.workspaceShared.name,
    });
    await expect(sharedWorkspaceRow.getByText("Owner")).toBeVisible();
    await expect(sharedWorkspaceRow.getByRole("link", { name: "Open" })).toHaveAttribute(
      "href",
      `/en/workspace?bbb=${fixtures.workspaceShared.id}`,
    );
  });

  test("app-admin can change an existing workspace member role", async ({ page }) => {
    const fixtures = await getAuthFixtures();

    await signInWithPassword(page, {
      locale: "en",
      email: fixtures.appAdminUser.email,
      password: fixtures.appAdminUser.password,
    });

    await expect(page).toHaveURL(/\/en\/workspace$/);
    await expect(page.getByRole("heading", { name: "Admin testing tools" })).toBeVisible({
      timeout: 10000,
    });

    const adminWorkspaceSelect = page.getByRole("textbox", { name: "Admin workspace" });
    await chooseSelectOption(adminWorkspaceSelect, `${fixtures.workspaceShared.name} (shared)`);

    const memberRow = page.getByRole("row").filter({
      hasText: fixtures.confirmedUser.email,
    });
    await expect(memberRow).toBeVisible({ timeout: 10000 });

    await chooseSelectOption(memberRow.getByRole("textbox").first(), "Admin");
    await memberRow.getByRole("button", { name: "Save role" }).click();
    await expect(page.getByText("Workspace access was updated.")).toBeVisible({
      timeout: 15000,
    });
    await expect(memberRow.getByRole("textbox").first()).toHaveValue("Admin");
  });

  test("member without ModuleLab role sees restricted workspace ModuleLab state", async ({ page }) => {
    test.skip(!isModuleEnabledForSuite("module-lab"), "ModuleLab is not enabled for this suite.");
    const fixtures = await getAuthFixtures();

    await signInWithPassword(page, {
      locale: "en",
      email: fixtures.confirmedUser.email,
      password: fixtures.confirmedUser.password,
    });

    await page.goto(`/en/module-lab?bbb=${fixtures.workspaceShared.id}`);
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByText(/does not have access to the module-lab diagnostics surface/i)).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole("button", { name: /queue module job/i })).toHaveCount(0);
  });

  test("owner can change ModuleLab access for a workspace member", async ({ page }) => {
    test.skip(!isModuleEnabledForSuite("module-lab"), "ModuleLab is not enabled for this suite.");
    const fixtures = await getAuthFixtures();

    await signInWithPassword(page, {
      locale: "en",
      email: fixtures.workspaceUser.email,
      password: fixtures.workspaceUser.password,
    });

    await chooseWorkspace(page, `${fixtures.workspaceShared.name} · Shared · Owner`);
    await expect(page).toHaveURL(new RegExp(`/en/workspace\\?bbb=${fixtures.workspaceShared.id}`));
    await expect(page.getByRole("heading", { name: "ModuleLab access" })).toBeVisible({
      timeout: 10000,
    });

    const moduleLabAccessCard = page.locator(".mantine-Card-root").filter({
      has: page.getByRole("heading", { name: "ModuleLab access" }),
    }).first();
    const memberCard = moduleLabAccessCard.locator(".mantine-Card-root").filter({
      hasText: fixtures.confirmedUser.email,
    });
    await expect(memberCard).toBeVisible({ timeout: 10000 });

    await chooseSelectOption(memberCard.getByRole("textbox").first(), "Viewer");
    await memberCard.getByRole("button", { name: "Save access" }).click();
    await expect(page.getByText("ModuleLab access was updated.")).toBeVisible({
      timeout: 15000,
    });

    await chooseSelectOption(memberCard.getByRole("textbox").first(), "Operator");
    await memberCard.getByRole("button", { name: "Save access" }).click();
    await expect(page.getByText("ModuleLab access was updated.")).toBeVisible({
      timeout: 15000,
    });
  });

  test("app ModuleLab navigation preserves selected workspace", async ({ page }) => {
    test.skip(!isModuleEnabledForSuite("module-lab"), "ModuleLab is not enabled for this suite.");
    const fixtures = await getAuthFixtures();

    await signInWithPassword(page, {
      locale: "en",
      email: fixtures.workspaceUser.email,
      password: fixtures.workspaceUser.password,
    });

    await chooseWorkspace(page, `${fixtures.workspaceShared.name} · Shared · Owner`);

    const moduleLabLink = page.locator(
      `a[href="/en/module-lab?bbb=${fixtures.workspaceShared.id}"]`,
    );
    await expect(moduleLabLink).toBeVisible();
    await moduleLabLink.click();
    await expect(page).toHaveURL(new RegExp(`/en/module-lab\\?bbb=${fixtures.workspaceShared.id}`));
  });
});
