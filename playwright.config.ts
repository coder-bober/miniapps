import { defineConfig, devices } from "@playwright/test";

import { loadE2EEnv } from "./playwright/load-e2e-env";

loadE2EEnv();

const baseURL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const basePort = new URL(baseURL).port || "3000";
const serverCommand = process.env.PLAYWRIGHT_SERVER_COMMAND ?? "npm run dev:e2e";

process.env.APP_ADMIN_EMAILS ??= "e2e-app-admin@example.com";

delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;
delete process.env.http_proxy;
delete process.env.https_proxy;
delete process.env.NO_PROXY;
delete process.env.no_proxy;

const sharedServerEnv = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  globalSetup: "./playwright/global-setup.ts",
  globalTeardown: "./playwright/global-teardown.ts",
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR ?? "test-results",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: serverCommand,
    env: {
      ...sharedServerEnv,
      PORT: sharedServerEnv.PORT ?? basePort,
    },
    url: baseURL,
    reuseExistingServer: true, // process.env.PLAYWRIGHT_REUSE_SERVER !== "false",
    timeout: 31000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
