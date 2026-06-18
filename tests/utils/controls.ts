import { expect, type Locator, type Page } from "@playwright/test";

export async function chooseSelectOption(locator: Locator, optionName: string | RegExp) {
  await expect(locator).toBeVisible({ timeout: 10000 });
  await locator.click();
  await locator.page().getByRole("option", { name: optionName }).click();
}

export async function chooseWorkspace(page: Page, label: string) {
  const workspaceSelect = page.getByRole("textbox", { name: "Workspace" });
  await chooseSelectOption(workspaceSelect, label);
  await expect(workspaceSelect).toHaveValue(label, {
    timeout: 10000,
  });
}

export async function getWorkspaceOptionLabel(page: Page, matcher: RegExp) {
  const workspaceSelect = page.getByRole("textbox", { name: "Workspace" });
  await expect(workspaceSelect).toBeVisible({ timeout: 10000 });
  await workspaceSelect.click();

  const option = page.getByRole("option").filter({ hasText: matcher }).first();
  const label = (await option.textContent())?.trim() ?? "";

  await workspaceSelect.press("Escape");

  if (!label) {
    throw new Error(`Workspace option matching ${matcher} was not found.`);
  }

  return label;
}
