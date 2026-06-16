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

await runCase("fresh bootstrap does not create legacy user_module_roles", async () => {
  const sql = await readFile(new URL("../../docs/SQL/bootstrap-supabase-initial.sql", import.meta.url), "utf8");

  assert.doesNotMatch(sql, /create table if not exists public\.user_module_roles/i);
  assert.doesNotMatch(sql, /create or replace function public\.handle_user_module_roles_updated_at/i);
  assert.doesNotMatch(sql, /create trigger set_user_module_roles_updated_at/i);
});

await runCase("runtime paths do not query legacy user_module_roles", async () => {
  const runtimeFiles = [
    "../../api/core/authz/module-access.mjs",
    "../../api/services/supabase.mjs",
    "../../src/core/authz/module-access.ts",
    "../../tests/utils/supabase-admin.ts",
  ];

  for (const file of runtimeFiles) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(source, /user_module_roles/);
  }
});

await runCase("legacy user module roles have an explicit retirement SQL", async () => {
  const sql = await readFile(new URL("../../docs/SQL/retire-user-module-roles.sql", import.meta.url), "utf8");

  assert.match(sql, /drop table if exists public\.user_module_roles cascade;/i);
  assert.match(sql, /drop function if exists public\.handle_user_module_roles_updated_at\(\) cascade;/i);
});
