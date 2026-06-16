import assert from "node:assert/strict";

import { createSignOutRedirectUrl } from "../../src/shared/auth/sign-out-redirect.mjs";

async function runCase(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

await runCase("sign-out redirect uses configured public site URL instead of request URL origin", async () => {
  const redirectUrl = createSignOutRedirectUrl({
    requestUrl: "http://localhost:3000/auth/sign-out",
    referer: "http://deb5.local:3000/en/workspace",
    siteUrl: "http://deb5.local:3000",
  });

  assert.equal(redirectUrl.toString(), "http://deb5.local:3000/en");
});

await runCase("sign-out redirect preserves locale from referer path", async () => {
  const redirectUrl = createSignOutRedirectUrl({
    requestUrl: "http://localhost:3000/auth/sign-out",
    referer: "http://deb5.local:3000/ru/settings",
    siteUrl: "http://deb5.local:3000",
  });

  assert.equal(redirectUrl.toString(), "http://deb5.local:3000/ru");
});

await runCase("sign-out redirect falls back to request origin when site URL is not configured", async () => {
  const redirectUrl = createSignOutRedirectUrl({
    requestUrl: "http://localhost:3000/auth/sign-out",
    referer: "http://localhost:3000/en/workspace",
    siteUrl: undefined,
  });

  assert.equal(redirectUrl.toString(), "http://localhost:3000/en");
});

await runCase("sign-out route delegates redirect URL construction to the shared site-url helper", async () => {
  const routeSource = await import("node:fs/promises").then(({ readFile }) =>
    readFile(new URL("../../src/app/auth/sign-out/route.ts", import.meta.url), "utf8"),
  );

  assert.match(routeSource, /createSignOutRedirectUrl/);
  assert.doesNotMatch(routeSource, /new URL\(`\/\$\{locale\}`\s*,\s*request\.url\)/);
});
