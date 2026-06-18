import assert from "node:assert/strict";
import { runCase } from "./helpers/test-helpers.mjs";

import { createClient } from "@supabase/supabase-js";

import { buildApiApp } from "../app.mjs";
import { assertApiEnv, getApiConfig } from "../config.mjs";
import { loadEnvFiles } from "../../scripts/load-env.mjs";
import { createApiServices } from "../services/supabase.mjs";

loadEnvFiles([".env.api.e2e.local", ".env.e2e.local"]);

const config = assertApiEnv(getApiConfig());

function createPublicClient() {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function createAdminClient() {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}


async function createDisposableConfirmedUser() {
  const admin = createAdminClient();
  const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `api-integration-${runId}@example.com`;
  const password = `QuietShift!${runId}`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    throw error;
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: data.user.id,
    username: `api_${runId.replace(/[^a-z0-9_]/g, "_")}`.slice(0, 30),
    full_name: "API Integration User",
    avatar_url: null,
  });

  if (profileError) {
    throw profileError;
  }

  return {
    id: data.user.id,
    email,
    password,
  };
}

async function deleteUserIfPresent(userId) {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);

  if (error && !error.message.toLowerCase().includes("not found")) {
    throw error;
  }
}

await runCase(
  "POST /v1/account/sign-out-everywhere verifies a real Supabase token and revokes refresh capability",
  async () => {
    const user = await createDisposableConfirmedUser();
    const publicClient = createPublicClient();
    const app = buildApiApp({
      services: createApiServices(config),
    });

    try {
      const signInResult = await publicClient.auth.signInWithPassword({
        email: user.email,
        password: user.password,
      });

      assert.equal(signInResult.error, null);
      assert.ok(signInResult.data.session?.access_token);
      assert.ok(signInResult.data.session?.refresh_token);

      const response = await app.inject({
        method: "POST",
        url: "/v1/account/sign-out-everywhere",
        headers: {
          authorization: `Bearer ${signInResult.data.session.access_token}`,
        },
      });

      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.json(), { ok: true });

      const refreshResult = await publicClient.auth.refreshSession({
        refresh_token: signInResult.data.session.refresh_token,
      });

      assert.notEqual(refreshResult.error, null);
    } finally {
      await app.close();
      await deleteUserIfPresent(user.id);
    }
  },
);
