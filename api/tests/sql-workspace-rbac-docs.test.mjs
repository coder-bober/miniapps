import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runCase } from "./helpers/test-helpers.mjs";


await runCase("initial bootstrap installs transactional ownership transfer RPC", async () => {
  const sql = await readFile(new URL("../../docs/SQL/bootstrap-supabase-initial.sql", import.meta.url), "utf8");

  assert.match(sql, /create or replace function public\.transfer_workspace_ownership\s*\(/i);
  assert.match(sql, /for update/i);
  assert.match(sql, /update public\.workspace_memberships[\s\S]+set role = 'admin'/i);
  assert.match(sql, /update public\.workspace_memberships[\s\S]+set role = 'owner'/i);
});

await runCase("full reset removes transactional ownership transfer RPC", async () => {
  const sql = await readFile(new URL("../../docs/SQL/reset-supabase-full.sql", import.meta.url), "utf8");

  assert.match(
    sql,
    /drop function if exists public\.transfer_workspace_ownership\(uuid, uuid, uuid\) cascade;/i,
  );
});
