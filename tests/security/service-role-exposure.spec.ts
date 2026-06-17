import { expect, test } from "@playwright/test";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const serviceRoleEnvName = "SUPABASE_SERVICE_ROLE_KEY";

function requireServiceRoleKey() {
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured for this test run.");
  }

  return serviceRoleKey;
}

async function collectFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const resolvedPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        return collectFiles(resolvedPath);
      }

      return [resolvedPath];
    }),
  );

  return files.flat();
}

function isTextAsset(file: string) {
  return [".css", ".html", ".js", ".json", ".map", ".mjs", ".txt"].includes(
    path.extname(file).toLowerCase(),
  );
}

test.describe("service role key exposure", () => {
  test.skip(!serviceRoleKey, "SUPABASE_SERVICE_ROLE_KEY is not configured for this test run.");

  test("browser-visible responses and globals do not expose the service role key", async ({
    page,
    baseURL,
  }) => {
    const checkedServiceRoleKey = requireServiceRoleKey();
    const baseOrigin = new URL(baseURL ?? "http://localhost:3000").origin;
    const exposedPayloads: string[] = [];

    page.on("response", async (response) => {
      const url = response.url();

      if (!url.startsWith(baseOrigin)) {
        return;
      }

      const request = response.request();
      const resourceType = request.resourceType();
      const contentType = response.headers()["content-type"] ?? "";

      if (!["document", "script", "fetch", "xhr"].includes(resourceType)) {
        return;
      }

      if (
        !contentType.includes("text") &&
        !contentType.includes("javascript") &&
        !contentType.includes("json")
      ) {
        return;
      }

      try {
        const body = await response.text();

        if (body.includes(checkedServiceRoleKey) || body.includes(serviceRoleEnvName)) {
          exposedPayloads.push(url);
        }
      } catch {
        // Ignore bodies Playwright cannot read.
      }
    });

    await page.goto("/en/settings");
    await expect(page).toHaveURL(/\/en\/(settings|sign-in)$/);
    await expect(page.getByRole("heading", { name: /Settings|Sign in/i })).toBeVisible({
      timeout: 10000,
    });

    const browserState = await page.evaluate(({ secret, envName }) => {
      const windowRecord = window as unknown as Record<string, unknown> & {
        process?: { env?: Record<string, string | undefined> };
      };

      const localStorageValues = Object.values({ ...localStorage });
      const sessionStorageValues = Object.values({ ...sessionStorage });
      const windowValues = Object.values(windowRecord).map((value) => {
        if (typeof value === "string") {
          return value;
        }

        try {
          return JSON.stringify(value);
        } catch {
          return "";
        }
      });

      return {
        cookie: document.cookie,
        html: document.documentElement.outerHTML,
        processEnvValue: windowRecord.process?.env?.SUPABASE_SERVICE_ROLE_KEY ?? null,
        processEnvNamePresent: JSON.stringify(windowRecord.process?.env ?? {}).includes(envName),
        localStorageContainsSecret: localStorageValues.some(
          (value) => typeof value === "string" && value.includes(secret),
        ),
        sessionStorageContainsSecret: sessionStorageValues.some(
          (value) => typeof value === "string" && value.includes(secret),
        ),
        windowContainsSecret: windowValues.some(
          (value) => typeof value === "string" && value.includes(secret),
        ),
      };
    }, { secret: checkedServiceRoleKey, envName: serviceRoleEnvName });

    expect(exposedPayloads).toEqual([]);
    expect(browserState.processEnvValue).toBeNull();
    expect(browserState.processEnvNamePresent).toBe(false);
    expect(browserState.localStorageContainsSecret).toBe(false);
    expect(browserState.sessionStorageContainsSecret).toBe(false);
    expect(browserState.windowContainsSecret).toBe(false);
    expect(browserState.cookie).not.toContain(checkedServiceRoleKey);
    expect(browserState.html).not.toContain(checkedServiceRoleKey);
    expect(browserState.html).not.toContain(serviceRoleEnvName);
  });

  test("built client assets do not contain the service role key", async () => {
    const checkedServiceRoleKey = requireServiceRoleKey();
    const staticDir = path.join(process.cwd(), ".next", "static");

    try {
      await access(staticDir);
    } catch {
      test.skip(true, "No production build artifacts found. Run `npm run build` before this check.");
      return;
    }

    const files = await collectFiles(staticDir);
    const leakingFiles: string[] = [];

    for (const file of files) {
      if (!isTextAsset(file)) {
        continue;
      }

      const content = await readFile(file, "utf8");

      if (content.includes(checkedServiceRoleKey) || content.includes(serviceRoleEnvName)) {
        leakingFiles.push(path.relative(process.cwd(), file));
      }
    }

    expect(leakingFiles).toEqual([]);
  });
});
