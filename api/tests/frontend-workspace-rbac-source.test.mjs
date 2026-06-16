import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function runCase(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

await runCase("frontend workspace RBAC helper has no legacy compatibility capability fallback", async () => {
  const source = await readFile(new URL("../../src/core/authz/module-access.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /resolveLegacyCompatibilityCapabilities/);
  assert.doesNotMatch(source, /WORKSPACE_RBAC_STRICT/);
  assert.doesNotMatch(source, /isMissingWorkspaceTables/);
});
