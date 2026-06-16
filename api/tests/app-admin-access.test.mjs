import assert from "node:assert/strict";

import { isAppAdminEmail, parseAppAdminEmails } from "../../src/shared/admin/app-admin.mjs";

async function runCase(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

await runCase("direct allowlist match grants app-admin access", async () => {
  assert.equal(isAppAdminEmail("admin@example.com", "admin@example.com"), true);
});

await runCase("email and allowlist entries are trimmed and lowercased", async () => {
  assert.equal(isAppAdminEmail(" Admin@Example.COM ", " admin@example.com "), true);
});

await runCase("comma-separated allowlist grants matching entries", async () => {
  assert.equal(isAppAdminEmail("second@example.com", "first@example.com, second@example.com"), true);
  assert.equal(isAppAdminEmail("third@example.com", "first@example.com, second@example.com"), false);
});

await runCase("empty or missing allowlist denies all emails", async () => {
  assert.equal(isAppAdminEmail("admin@example.com", ""), false);
  assert.equal(isAppAdminEmail("admin@example.com", " , "), false);
  assert.equal(isAppAdminEmail("admin@example.com", undefined), false);
});

await runCase("blank or non-string emails are never app-admin", async () => {
  assert.equal(isAppAdminEmail("", "admin@example.com"), false);
  assert.equal(isAppAdminEmail("   ", "admin@example.com"), false);
  assert.equal(isAppAdminEmail(null, "admin@example.com"), false);
});

await runCase("allowlist parsing removes empty and duplicate entries", async () => {
  assert.deepEqual(parseAppAdminEmails(" admin@example.com, ,ADMIN@example.com, second@example.com "), [
    "admin@example.com",
    "second@example.com",
  ]);
});
