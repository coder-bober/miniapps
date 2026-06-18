import assert from "node:assert/strict";
import { runCase } from "./helpers/test-helpers.mjs";

import { createAuthCallbackRedirectUrl } from "../../src/shared/auth/callback-redirect.mjs";


await runCase("auth callback redirect uses configured public site URL instead of request URL origin", async () => {
  const redirectUrl = createAuthCallbackRedirectUrl({
    path: "/en/reset-password",
    requestUrl: "http://localhost:3001/auth/callback?next=/en/reset-password",
    siteUrl: "http://deb4:3001",
  });

  assert.equal(redirectUrl.toString(), "http://deb4:3001/en/reset-password");
});

await runCase("auth callback redirect preserves query parameters", async () => {
  const redirectUrl = createAuthCallbackRedirectUrl({
    path: "/en/sign-in?message=Password%20updated",
    requestUrl: "http://localhost:3001/auth/callback",
    siteUrl: "http://deb4:3001",
  });

  assert.equal(redirectUrl.toString(), "http://deb4:3001/en/sign-in?message=Password%20updated");
});

await runCase("auth callback redirect falls back to request origin when site URL is not configured", async () => {
  const redirectUrl = createAuthCallbackRedirectUrl({
    path: "/en/reset-password",
    requestUrl: "http://localhost:3001/auth/callback?next=/en/reset-password",
    siteUrl: undefined,
  });

  assert.equal(redirectUrl.toString(), "http://localhost:3001/en/reset-password");
});

await runCase("auth callback route delegates redirect URL construction to the shared site-url helper", async () => {
  const routeSource = await import("node:fs/promises").then(({ readFile }) =>
    readFile(new URL("../../src/app/auth/callback/route.ts", import.meta.url), "utf8"),
  );

  assert.match(routeSource, /createAuthCallbackRedirectUrl/);
  assert.doesNotMatch(routeSource, /new URL\((failurePath|errorPath|next),\s*request\.url\)/);
});
