import { expect, test } from "@playwright/test";
import { signInWithPassword, getAuthFixtures } from "./auth/helpers";
import { attachBrowserErrorCapture } from "./utils/browser-errors";
import { isModuleEnabledForSuite } from "./utils/modules";

test.skip(
  !isModuleEnabledForSuite("module-lab", { defaultWhenUnset: false }),
  "module-lab public smoke tests run only when the module-lab module is enabled for the suite.",
);

function assertModuleLabRbacReady(fixtures: Awaited<ReturnType<typeof getAuthFixtures>>) {
  if (!fixtures.moduleLabRbacReady) {
    throw new Error(
      fixtures.moduleLabRbacPreflightError ??
        "Module-lab RBAC SQL is not configured for this environment.",
    );
  }
}

test("module-lab public page loads without browser errors when the module is enabled", async ({ page }) => {
  const { pageErrors, consoleErrors, failedRequests } = attachBrowserErrorCapture(page);

  const response = await page.goto("/en/module-lab");

  expect(response?.ok()).toBeTruthy();
  await expect(page).toHaveTitle(/Module Lab/i);
  await expect(page.getByRole("heading", { level: 1, name: /module lab/i })).toBeVisible();
  await expect(page.getByText(/sign in to run module diagnostics/i)).toBeVisible();

  expect(pageErrors, `Page errors:\n${pageErrors.join("\n")}`).toEqual([]);
  expect(consoleErrors, `Console errors:\n${consoleErrors.join("\n")}`).toEqual([]);
  expect(failedRequests, `Failed requests:\n${failedRequests.join("\n")}`).toEqual([]);
});

test("module-lab public page resolves a public bbb workspace and shows a fallback notice for an invalid one", async ({ page }) => {
  const fixtures = await getAuthFixtures();
  const { pageErrors, consoleErrors, failedRequests } = attachBrowserErrorCapture(page);

  const publicResponse = await page.goto(`/en/module-lab?bbb=${fixtures.moduleLabPublicWorkspace.id}`);

  expect(publicResponse?.ok()).toBeTruthy();
  await expect(
    page.getByText(new RegExp(fixtures.moduleLabPublicWorkspace.name, "i")),
  ).toBeVisible();

  const fallbackResponse = await page.goto("/en/module-lab?bbb=missing-workspace-id");

  expect(fallbackResponse?.ok()).toBeTruthy();
  await expect(page.getByText(/requested public workspace is unavailable/i)).toBeVisible();

  expect(pageErrors, `Page errors:\n${pageErrors.join("\n")}`).toEqual([]);
  expect(consoleErrors, `Console errors:\n${consoleErrors.join("\n")}`).toEqual([]);
  expect(failedRequests, `Failed requests:\n${failedRequests.join("\n")}`).toEqual([]);
});

test("module-lab signed-in page queues a module job without browser errors when the module is enabled", async ({ page }) => {
  const fixtures = await getAuthFixtures();
  assertModuleLabRbacReady(fixtures);
  const { pageErrors, consoleErrors, failedRequests } = attachBrowserErrorCapture(page);

  await signInWithPassword(page, {
    locale: "en",
    email: fixtures.moduleLabOperatorUser.email,
    password: fixtures.moduleLabOperatorUser.password,
  });

  await page.goto(`/en/module-lab?bbb=${fixtures.moduleLabPublicWorkspace.id}`);

  await expect(page).toHaveTitle(/Module Lab/i);
  await expect(page.getByRole("heading", { level: 1, name: /module lab/i })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: /module health probe/i })).toBeVisible();

  await page.getByLabel(/job message/i).fill("Module lab browser test");
  await page.getByRole("button", { name: /queue module job/i }).click();

  await expect(page.getByRole("alert").getByText(/the module-lab job was queued/i)).toBeVisible();

  expect(pageErrors, `Page errors:\n${pageErrors.join("\n")}`).toEqual([]);
  expect(consoleErrors, `Console errors:\n${consoleErrors.join("\n")}`).toEqual([]);
  expect(failedRequests, `Failed requests:\n${failedRequests.join("\n")}`).toEqual([]);
});

test("module-lab signed-in viewer sees diagnostics without queue controls", async ({ page }) => {
  const fixtures = await getAuthFixtures();
  assertModuleLabRbacReady(fixtures);
  const { pageErrors, consoleErrors, failedRequests } = attachBrowserErrorCapture(page);

  await signInWithPassword(page, {
    locale: "en",
    email: fixtures.moduleLabViewerUser.email,
    password: fixtures.moduleLabViewerUser.password,
  });

  await page.goto(`/en/module-lab?bbb=${fixtures.moduleLabPublicWorkspace.id}`);

  await expect(page).toHaveTitle(/Module Lab/i);
  await expect(page.getByRole("heading", { level: 3, name: /module health probe/i })).toBeVisible();
  await expect(page.getByText(/can review module diagnostics, but it cannot queue module jobs/i)).toBeVisible();
  await expect(page.getByText(/module-lab\.echo/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /queue module job/i })).toBeDisabled();

  expect(pageErrors, `Page errors:\n${pageErrors.join("\n")}`).toEqual([]);
  expect(consoleErrors, `Console errors:\n${consoleErrors.join("\n")}`).toEqual([]);
  expect(failedRequests, `Failed requests:\n${failedRequests.join("\n")}`).toEqual([]);
});

test("module-lab signed-in user without a module role sees the restricted state", async ({ page }) => {
  const fixtures = await getAuthFixtures();
  assertModuleLabRbacReady(fixtures);
  const { pageErrors, consoleErrors, failedRequests } = attachBrowserErrorCapture(page);

  await signInWithPassword(page, {
    locale: "en",
    email: fixtures.confirmedUser.email,
    password: fixtures.confirmedUser.password,
  });

  await page.goto("/en/module-lab");

  await expect(page).toHaveTitle(/Module Lab/i);
  await expect(page.getByText(/does not have access to the module-lab diagnostics surface/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /queue module job/i })).toHaveCount(0);
  await expect(page.getByText(/module-lab\.echo/i)).toHaveCount(0);

  expect(pageErrors, `Page errors:\n${pageErrors.join("\n")}`).toEqual([]);
  expect(consoleErrors, `Console errors:\n${consoleErrors.join("\n")}`).toEqual([]);
  expect(failedRequests, `Failed requests:\n${failedRequests.join("\n")}`).toEqual([]);
});

test("module-lab Next proxy denies job enqueue for a signed-in viewer", async ({ page }) => {
  const fixtures = await getAuthFixtures();
  assertModuleLabRbacReady(fixtures);

  await signInWithPassword(page, {
    locale: "en",
    email: fixtures.moduleLabViewerUser.email,
    password: fixtures.moduleLabViewerUser.password,
  });

  const response = await page.request.post(
    `/api/module-lab?bbb=${fixtures.moduleLabPublicWorkspace.id}`,
    {
      data: {
        message: "Viewer should be blocked",
      },
    },
  );
  const payload = await response.json();

  expect(response.status()).toBe(403);
  expect(payload).toEqual({
    error: "module_capability_required",
    message: "The current user lacks the required module capability.",
    requiredCapability: "module-lab.run_job",
  });
});

test("module-lab Next proxy denies status access for a signed-in user without a module role", async ({ page }) => {
  const fixtures = await getAuthFixtures();
  assertModuleLabRbacReady(fixtures);

  await signInWithPassword(page, {
    locale: "en",
    email: fixtures.confirmedUser.email,
    password: fixtures.confirmedUser.password,
  });

  const response = await page.request.get(
    `/api/module-lab?bbb=${fixtures.moduleLabPublicWorkspace.id}`,
  );
  const payload = await response.json();

  expect(response.status()).toBe(403);
  expect(payload).toEqual({
    error: "module_capability_required",
    message: "The current user lacks the required module capability.",
    requiredCapability: "module-lab.read",
  });
});
