import { expect, test } from "@playwright/test";
import sharp from "sharp";

import { getAuthFixtures, signInWithPassword } from "./helpers";
import { chooseWorkspace, getWorkspaceOptionLabel } from "../utils/controls";
import { isModuleEnabledForSuite } from "../utils/modules";

test.skip(
  !isModuleEnabledForSuite("workspace-files"),
  "workspace-files browser tests run only when the workspace-files module is enabled for the suite.",
);

test.describe("workspace files", () => {
  test("authenticated user can switch between personal and shared workspaces", async ({
    page,
  }) => {
    test.setTimeout(60000);
    const fixtures = await getAuthFixtures();

    await signInWithPassword(page, {
      locale: "en",
      email: fixtures.workspaceUser.email,
      password: fixtures.workspaceUser.password,
    });

    await expect(page).toHaveURL(/\/en\/workspace$/);

    const uniqueName = `shared-${Date.now().toString(36)}.txt`;

    await chooseWorkspace(page, `${fixtures.workspaceShared.name} · Shared · Owner`);

    await page.locator('input[type="file"]').setInputFiles({
      name: uniqueName,
      mimeType: "text/plain",
      buffer: Buffer.from("hello shared workspace e2e"),
    });

    await expect(page.getByText("The file was uploaded.")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 15000 });

    const personalWorkspaceLabel = await getWorkspaceOptionLabel(page, /Personal workspace .*Personal .*Owner/i);
    await chooseWorkspace(page, personalWorkspaceLabel);
    await expect(page.getByText(uniqueName)).not.toBeVisible();

    await chooseWorkspace(page, `${fixtures.workspaceShared.name} · Shared · Owner`);
    await expect(page.getByText(uniqueName)).toBeVisible();

    await page
      .locator("div")
      .filter({ has: page.getByText(uniqueName) })
      .getByRole("button", { name: "Delete" })
      .click();

    await expect(page.getByText(uniqueName)).not.toBeVisible({ timeout: 20000 });
  });

  test("authenticated user can upload and delete a workspace file", async ({ page }) => {
    const fixtures = await getAuthFixtures();
    const fileName = `notes-${Date.now().toString(36)}.txt`;

    await signInWithPassword(page, {
      locale: "en",
      email: fixtures.workspaceUser.email,
      password: fixtures.workspaceUser.password,
    });

    await expect(page).toHaveURL(/\/en\/workspace$/);

    await page.locator('input[type="file"]').setInputFiles({
      name: fileName,
      mimeType: "text/plain",
      buffer: Buffer.from("hello e2e workspace"),
    });

    await expect(page.getByText("The file was uploaded.")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(fileName)).toBeVisible({ timeout: 15000 });

    await page
      .locator("div")
      .filter({ has: page.getByText(fileName) })
      .getByRole("button", { name: "Delete" })
      .click();

    await expect(page.getByText("The file was deleted.")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("No files uploaded yet.")).toBeVisible();
  });

  test("authenticated user sees generated thumbnail preview for an uploaded image", async ({
    page,
  }) => {
    const fixtures = await getAuthFixtures();
    const fileName = `preview-${Date.now().toString(36)}.png`;

    await signInWithPassword(page, {
      locale: "en",
      email: fixtures.workspaceUser.email,
      password: fixtures.workspaceUser.password,
    });

    await expect(page).toHaveURL(/\/en\/workspace$/);

    const imageBuffer = await sharp({
      create: {
        width: 12,
        height: 12,
        channels: 3,
        background: {
          r: 12,
          g: 140,
          b: 220,
        },
      },
    })
      .png()
      .toBuffer();

    await page.locator('input[type="file"]').setInputFiles({
      name: fileName,
      mimeType: "image/png",
      buffer: imageBuffer,
    });

    await expect(page.getByText("The file was uploaded.")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(fileName)).toBeVisible({ timeout: 15000 });

    const thumbnailImage = page.locator(`img[alt="${fileName}"]`).first();
    await expect(thumbnailImage).toBeVisible({ timeout: 10000 });
    await expect(thumbnailImage).toHaveAttribute("src", /\/api\/workspace-files\/.+\/thumbnail/);

    await expect
      .poll(async () => {
        return thumbnailImage.evaluate((image) => {
          const element = image as HTMLImageElement;
          return element.complete && element.naturalWidth > 0;
        });
      }, { timeout: 10000 })
      .toBe(true);

    await page
      .locator("div")
      .filter({ has: page.getByText(fileName) })
      .getByRole("button", { name: "Delete" })
      .click();

    await expect(page.getByText("The file was deleted.")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(fileName)).not.toBeVisible();
  });
});
