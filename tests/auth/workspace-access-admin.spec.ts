import { expect, test } from "@playwright/test";

import { getAuthFixtures, signInWithPassword } from "./helpers";
import {
  createWorkspaceAccessAdminFixtureWorkspace,
  deleteWorkspaceFixtureById,
  hasSupabaseAdminEnv,
} from "../utils/supabase-admin";
import { chooseSelectOption, chooseWorkspace } from "../utils/controls";
import { isModuleEnabledForSuite } from "../utils/modules";

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

    const sharedWorkspaceRow = page.getByTestId(`workspace-access-row-${fixtures.workspaceShared.id}`);
    await expect(sharedWorkspaceRow.getByText("Owner")).toBeVisible();
    await expect(sharedWorkspaceRow.getByRole("link", { name: "Open" })).toHaveAttribute(
      "href",
      `/en/workspace?bbb=${fixtures.workspaceShared.id}`,
    );
  });

  test("app-admin can change an existing workspace member role", async ({ page }) => {
    const fixtures = await getAuthFixtures();
    const adminWorkspace = await createWorkspaceAccessAdminFixtureWorkspace(fixtures);

    try {
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
      await chooseSelectOption(
        adminWorkspaceSelect,
        `${adminWorkspace.name} (shared) - ${adminWorkspace.slug}`,
      );
      await expect(
        page.getByTestId(`admin-workspace-members-${adminWorkspace.id}`),
      ).toBeVisible({ timeout: 10000 });

      const memberRow = page.getByTestId(`admin-workspace-member-row-${fixtures.confirmedUser.id}`);
      await expect(memberRow).toBeVisible({ timeout: 10000 });

      await chooseSelectOption(
        page.getByTestId(`admin-workspace-member-role-select-${fixtures.confirmedUser.id}`),
        "Admin",
      );
      await page.getByTestId(`admin-workspace-member-role-save-${fixtures.confirmedUser.id}`).click();
      await expect(page.getByText("Workspace access was updated.")).toBeVisible({
        timeout: 15000,
      });
      await expect(
        page.getByTestId(`admin-workspace-member-role-select-${fixtures.confirmedUser.id}`),
      ).toHaveValue("Admin");
    } finally {
      await deleteWorkspaceFixtureById(adminWorkspace.id);
    }
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

    const moduleLabAccessCard = page.getByTestId(`workspace-module-lab-access-${fixtures.workspaceShared.id}`);
    const memberCard = page.getByTestId(`workspace-module-lab-access-member-${fixtures.confirmedUser.id}`);
    await expect(moduleLabAccessCard).toBeVisible({ timeout: 10000 });
    await expect(memberCard).toBeVisible({ timeout: 10000 });

    await chooseSelectOption(
      page.getByTestId(`workspace-module-lab-access-select-${fixtures.confirmedUser.id}`),
      "Viewer",
    );
    await page.getByTestId(`workspace-module-lab-access-save-${fixtures.confirmedUser.id}`).click();
    await expect(page.getByText("ModuleLab access was updated.")).toBeVisible({
      timeout: 15000,
    });

    await chooseSelectOption(
      page.getByTestId(`workspace-module-lab-access-select-${fixtures.confirmedUser.id}`),
      "Operator",
    );
    await page.getByTestId(`workspace-module-lab-access-save-${fixtures.confirmedUser.id}`).click();
    await expect(page.getByText("ModuleLab access was updated.")).toBeVisible({
      timeout: 15000,
    });

    await page.context().clearCookies();
    await signInWithPassword(page, {
      locale: "en",
      email: fixtures.confirmedUser.email,
      password: fixtures.confirmedUser.password,
    });

    await page.goto(`/en/module-lab?bbb=${fixtures.workspaceShared.id}`);
    await expect(page.getByRole("button", { name: /queue module job/i })).toBeEnabled({
      timeout: 15000,
    });
    await expect(page.getByText(/does not have access to the module-lab diagnostics surface/i)).toHaveCount(0);
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
