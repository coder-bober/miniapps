import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

type AuthFixtureState = {
  moduleLabRbacReady: boolean;
  moduleLabRbacPreflightError?: string | null;
  workspaceShared: {
    id: string;
    slug: string;
    name: string;
  };
  moduleLabPublicWorkspace: {
    id: string;
    slug: string;
    name: string;
  };
  confirmedUser: {
    id: string;
    email: string;
    password: string;
  };
  resetUser: {
    id: string;
    email: string;
    password: string;
  };
  settingsUser: {
    id: string;
    email: string;
    password: string;
  };
  sessionUser: {
    id: string;
    email: string;
    password: string;
  };
  workspaceUser: {
    id: string;
    email: string;
    password: string;
  };
  appAdminUser: {
    id: string;
    email: string;
    password: string;
  };
  moduleLabOperatorUser: {
    id: string;
    email: string;
    password: string;
  };
  moduleLabViewerUser: {
    id: string;
    email: string;
    password: string;
  };
  deletionValidationUser: {
    id: string;
    email: string;
    password: string;
  };
  deletionUser: {
    id: string;
    email: string;
    password: string;
  };
  unconfirmedUser: {
    id: string;
    email: string;
    password: string;
  };
};

const authStatePath = path.join(process.cwd(), ".playwright", "auth-fixtures.json");
const retryDelayMs = 2000; // 750
const retryCount = 4;

export function hasSupabaseAdminEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY),
  );
}

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase admin environment variables. Expected NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function writeAuthFixtureState(state: AuthFixtureState) {
  await mkdir(path.dirname(authStatePath), { recursive: true });
  await writeFile(authStatePath, JSON.stringify(state, null, 2), "utf8");
}

export async function readAuthFixtureState() {
  const raw = await readFile(authStatePath, "utf8");
  return JSON.parse(raw) as AuthFixtureState;
}

export async function removeAuthFixtureState() {
  await rm(authStatePath, { force: true });
}

async function withRetry<T>(operation: () => Promise<T>) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retryCount; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === retryCount) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt));
    }
  }

  throw lastError;
}

async function deleteUserById(id: string) {
  const supabase = getSupabaseAdminClient();
  const { error: deleteError } = await withRetry(() => supabase.auth.admin.deleteUser(id));

  if (deleteError) {
    if (deleteError.message.toLowerCase().includes("not found")) {
      return;
    }

    throw deleteError;
  }
}

async function getUserByEmail(email: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await withRetry(() => supabase.auth.admin.listUsers());

  if (error) {
    throw error;
  }

  return data.users.find((user) => user.email === email) ?? null;
}

export async function findUserByEmail(email: string) {
  return getUserByEmail(email);
}

export async function getProfileById(id: string) {
  const supabase = getSupabaseAdminClient();
  const profileResponse = await withRetry<{
    data: { id: string } | null;
    error: { message: string } | null;
  }>(async () => await supabase.from("profiles").select("id").eq("id", id).maybeSingle());
  const { data, error } = profileResponse;

  if (error) {
    throw error;
  }

  return data;
}

async function upsertWorkspaceModuleRole(
  workspaceId: string,
  userId: string,
  moduleId: string,
  role: string,
) {
  const supabase = getSupabaseAdminClient();
  const response = await withRetry<{
    error: { code?: string; message?: string } | null;
  }>(async () =>
    await supabase.from("workspace_module_roles").upsert(
      {
        workspace_id: workspaceId,
        user_id: userId,
        module_id: moduleId,
        role,
      },
      { onConflict: "workspace_id,user_id,module_id" },
    ),
  );
  const { error } = response;

  if (error) {
    throw error;
  }
}

async function resetWorkspaceMemberships(
  workspaceId: string,
  memberships: Array<{ userId: string; role: string }>,
) {
  const supabase = getSupabaseAdminClient();
  const deleteResponse = await withRetry<{
    error: { code?: string; message?: string } | null;
  }>(async () =>
    await supabase.from("workspace_memberships").delete().eq("workspace_id", workspaceId),
  );

  if (deleteResponse.error) {
    throw deleteResponse.error;
  }

  const insertResponse = await withRetry<{
    error: { code?: string; message?: string } | null;
  }>(async () =>
    await supabase.from("workspace_memberships").insert(
      memberships.map((membership) => ({
        workspace_id: workspaceId,
        user_id: membership.userId,
        role: membership.role,
      })),
    ),
  );

  if (insertResponse.error) {
    throw insertResponse.error;
  }
}

export async function ensureAuthFixtureWorkspaceMemberships(state?: AuthFixtureState) {
  if (!hasSupabaseAdminEnv()) {
    return state ?? await readAuthFixtureState();
  }

  const resolvedState = state ?? await readAuthFixtureState();
  const workspaceUser = await getUserByEmail(resolvedState.workspaceUser.email);
  const confirmedUser = await getUserByEmail(resolvedState.confirmedUser.email);
  const moduleLabOperatorUser = resolvedState.moduleLabPublicWorkspace.id
    ? await getUserByEmail(resolvedState.moduleLabOperatorUser.email)
    : null;
  const moduleLabViewerUser = resolvedState.moduleLabPublicWorkspace.id
    ? await getUserByEmail(resolvedState.moduleLabViewerUser.email)
    : null;

  if (!workspaceUser?.id || !confirmedUser?.id) {
    throw new Error("Auth fixture users are missing from Supabase.");
  }

  await resetWorkspaceMemberships(resolvedState.workspaceShared.id, [
    { userId: workspaceUser.id, role: "owner" },
    { userId: confirmedUser.id, role: "member" },
  ]);

  if (resolvedState.moduleLabPublicWorkspace.id) {
    if (!moduleLabOperatorUser?.id || !moduleLabViewerUser?.id) {
      throw new Error("ModuleLab fixture users are missing from Supabase.");
    }

    await resetWorkspaceMemberships(resolvedState.moduleLabPublicWorkspace.id, [
      { userId: moduleLabOperatorUser.id, role: "owner" },
      { userId: moduleLabViewerUser.id, role: "member" },
    ]);
  }

  return resolvedState;
}

async function createUser(email: string, password: string, emailConfirmed: boolean) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await withRetry(() =>
    supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: emailConfirmed,
    }),
  );

  if (error) {
    throw error;
  }

  const usernameBase = email
    .split("@")[0]
    .replace(/[^a-z0-9_]/g, "_")
    .slice(0, 30);

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: data.user.id,
    full_name: emailConfirmed ? "E2E Confirmed User" : null,
    username: emailConfirmed ? usernameBase : null,
    avatar_url: null,
  });

  if (profileError) {
    throw profileError;
  }

  return data.user.id;
}

function getAppAdminFixtureEmail() {
  return process.env.APP_ADMIN_EMAILS?.split(",")[0]?.trim().toLowerCase() || "e2e-app-admin@example.com";
}

async function createPersonalWorkspaceForUser(userId: string, email: string) {
  const supabase = getSupabaseAdminClient();
  const existingWorkspaceResponse = await withRetry(async () =>
    await supabase
      .from("workspaces")
      .select("id")
      .eq("kind", "personal")
      .eq("personal_owner_user_id", userId)
      .maybeSingle(),
  );

  if (existingWorkspaceResponse.error) {
    throw existingWorkspaceResponse.error;
  }

  const existingWorkspaceId = existingWorkspaceResponse.data?.id ?? null;

  if (existingWorkspaceId) {
    const membershipResponse = await withRetry(async () =>
      await supabase.from("workspace_memberships").upsert(
        {
          workspace_id: existingWorkspaceId,
          user_id: userId,
          role: "owner",
        },
        { onConflict: "workspace_id,user_id" },
      ),
    );

    if (membershipResponse.error) {
      throw membershipResponse.error;
    }

    return existingWorkspaceId;
  }

  const slugBase = email.split("@")[0].replace(/[^a-z0-9_-]/g, "-").slice(0, 48) || "user";
  const slug = `user-${slugBase}`.slice(0, 64);
  const name = `${email.split("@")[0]} workspace`.slice(0, 120);
  const workspaceResponse = await withRetry(async () =>
    await supabase
      .from("workspaces")
      .insert({
        kind: "personal",
        slug,
        name,
        personal_owner_user_id: userId,
      })
      .select("id")
      .single(),
  );

  if (workspaceResponse.error) {
    throw workspaceResponse.error;
  }

  const membershipResponse = await withRetry(async () =>
    await supabase.from("workspace_memberships").insert({
      workspace_id: workspaceResponse.data.id,
      user_id: userId,
      role: "owner",
    }),
  );

  if (membershipResponse.error) {
    throw membershipResponse.error;
  }

  return workspaceResponse.data.id as string;
}

async function createSharedWorkspaceForUser(ownerUserId: string, runId: string, options: { isPublic?: boolean; slugPrefix?: string; namePrefix?: string } = {}) {
  const supabase = getSupabaseAdminClient();
  const slug = `${options.slugPrefix ?? "team"}-${runId}`.slice(0, 64);
  const name = `${options.namePrefix ?? "Team Workspace"} ${runId}`;
  const workspaceResponse = await withRetry(async () =>
    await supabase
      .from("workspaces")
      .insert({
        kind: "shared",
        slug,
        name,
        is_public: options.isPublic ?? false,
      })
      .select("id, slug, name")
      .single(),
  );

  if (workspaceResponse.error) {
    throw workspaceResponse.error;
  }

  const membershipResponse = await withRetry(async () =>
    await supabase.from("workspace_memberships").insert({
      workspace_id: workspaceResponse.data.id,
      user_id: ownerUserId,
      role: "owner",
    }),
  );

  if (membershipResponse.error) {
    throw membershipResponse.error;
  }

  return workspaceResponse.data;
}

export async function createWorkspaceAccessAdminFixtureWorkspace(state: AuthFixtureState) {
  const ownerUser = await getUserByEmail(state.workspaceUser.email);
  const memberUser = await getUserByEmail(state.confirmedUser.email);

  if (!ownerUser?.id || !memberUser?.id) {
    throw new Error("Workspace access admin fixture users are missing from Supabase.");
  }

  const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const workspace = await createSharedWorkspaceForUser(ownerUser.id, runId, {
    slugPrefix: "admin-access",
    namePrefix: "Admin Access Workspace",
  });

  await resetWorkspaceMemberships(workspace.id, [
    { userId: ownerUser.id, role: "owner" },
    { userId: memberUser.id, role: "member" },
  ]);

  return workspace;
}

export async function deleteWorkspaceFixtureById(id: string) {
  await deleteWorkspaceById(id);
}

async function deleteWorkspaceById(id: string) {
  const supabase = getSupabaseAdminClient();
  const { error } = await withRetry(async () => await supabase.from("workspaces").delete().eq("id", id));

  if (error) {
    throw error;
  }
}

export async function seedAuthFixtureUsers() {
  if (!hasSupabaseAdminEnv()) {
    return null;
  }

  const runId = Date.now().toString(36);
  const state: AuthFixtureState = {
    moduleLabRbacReady: false,
    moduleLabRbacPreflightError: null,
    workspaceShared: {
      id: "",
      slug: "",
      name: "",
    },
    moduleLabPublicWorkspace: {
      id: "",
      slug: "",
      name: "",
    },
    confirmedUser: {
      id: "",
      email: `e2e-confirmed-${runId}@example.com`,
      password: `QuietShift!${runId}`,
    },
    resetUser: {
      id: "",
      email: `e2e-reset-${runId}@example.com`,
      password: `QuietShift!${runId}`,
    },
    settingsUser: {
      id: "",
      email: `e2e-settings-${runId}@example.com`,
      password: `QuietShift!${runId}`,
    },
    sessionUser: {
      id: "",
      email: `e2e-session-${runId}@example.com`,
      password: `QuietShift!${runId}`,
    },
    workspaceUser: {
      id: "",
      email: `e2e-workspace-${runId}@example.com`,
      password: `QuietShift!${runId}`,
    },
    appAdminUser: {
      id: "",
      email: getAppAdminFixtureEmail(),
      password: `QuietShift!${runId}`,
    },
    moduleLabOperatorUser: {
      id: "",
      email: `e2e-module-lab-operator-${runId}@example.com`,
      password: `QuietShift!${runId}`,
    },
    moduleLabViewerUser: {
      id: "",
      email: `e2e-module-lab-viewer-${runId}@example.com`,
      password: `QuietShift!${runId}`,
    },
    deletionValidationUser: {
      id: "",
      email: `e2e-delete-validate-${runId}@example.com`,
      password: `QuietShift!${runId}`,
    },
    deletionUser: {
      id: "",
      email: `e2e-delete-${runId}@example.com`,
      password: `QuietShift!${runId}`,
    },
    unconfirmedUser: {
      id: "",
      email: `e2e-unconfirmed-${runId}@example.com`,
      password: `QuietShift!${runId}`,
    },
  };

  const existingConfirmedUser = await getUserByEmail(state.confirmedUser.email);
  const existingResetUser = await getUserByEmail(state.resetUser.email);
  const existingSettingsUser = await getUserByEmail(state.settingsUser.email);
  const existingSessionUser = await getUserByEmail(state.sessionUser.email);
  const existingWorkspaceUser = await getUserByEmail(state.workspaceUser.email);
  const existingAppAdminUser = await getUserByEmail(state.appAdminUser.email);
  const existingModuleLabOperatorUser = await getUserByEmail(state.moduleLabOperatorUser.email);
  const existingModuleLabViewerUser = await getUserByEmail(state.moduleLabViewerUser.email);
  const existingDeletionValidationUser = await getUserByEmail(state.deletionValidationUser.email);
  const existingDeletionUser = await getUserByEmail(state.deletionUser.email);
  const existingUnconfirmedUser = await getUserByEmail(state.unconfirmedUser.email);

  if (existingConfirmedUser) {
    await deleteUserById(existingConfirmedUser.id);
  }

  if (existingResetUser) {
    await deleteUserById(existingResetUser.id);
  }

  if (existingSettingsUser) {
    await deleteUserById(existingSettingsUser.id);
  }

  if (existingSessionUser) {
    await deleteUserById(existingSessionUser.id);
  }

  if (existingWorkspaceUser) {
    await deleteUserById(existingWorkspaceUser.id);
  }

  if (existingAppAdminUser) {
    await deleteUserById(existingAppAdminUser.id);
  }

  if (existingModuleLabOperatorUser) {
    await deleteUserById(existingModuleLabOperatorUser.id);
  }

  if (existingModuleLabViewerUser) {
    await deleteUserById(existingModuleLabViewerUser.id);
  }

  if (existingDeletionValidationUser) {
    await deleteUserById(existingDeletionValidationUser.id);
  }

  if (existingDeletionUser) {
    await deleteUserById(existingDeletionUser.id);
  }

  if (existingUnconfirmedUser) {
    await deleteUserById(existingUnconfirmedUser.id);
  }

  state.confirmedUser.id = await createUser(
    state.confirmedUser.email,
    state.confirmedUser.password,
    true,
  );
  await createPersonalWorkspaceForUser(state.confirmedUser.id, state.confirmedUser.email);
  state.resetUser.id = await createUser(
    state.resetUser.email,
    state.resetUser.password,
    true,
  );
  await createPersonalWorkspaceForUser(state.resetUser.id, state.resetUser.email);
  state.settingsUser.id = await createUser(
    state.settingsUser.email,
    state.settingsUser.password,
    true,
  );
  await createPersonalWorkspaceForUser(state.settingsUser.id, state.settingsUser.email);
  state.sessionUser.id = await createUser(
    state.sessionUser.email,
    state.sessionUser.password,
    true,
  );
  await createPersonalWorkspaceForUser(state.sessionUser.id, state.sessionUser.email);
  state.workspaceUser.id = await createUser(
    state.workspaceUser.email,
    state.workspaceUser.password,
    true,
  );
  await createPersonalWorkspaceForUser(state.workspaceUser.id, state.workspaceUser.email);
  state.workspaceShared = await createSharedWorkspaceForUser(state.workspaceUser.id, runId);
  state.appAdminUser.id = await createUser(
    state.appAdminUser.email,
    state.appAdminUser.password,
    true,
  );
  await createPersonalWorkspaceForUser(state.appAdminUser.id, state.appAdminUser.email);
  state.moduleLabOperatorUser.id = await createUser(
    state.moduleLabOperatorUser.email,
    state.moduleLabOperatorUser.password,
    true,
  );
  const moduleLabOperatorPersonalWorkspaceId = await createPersonalWorkspaceForUser(
    state.moduleLabOperatorUser.id,
    state.moduleLabOperatorUser.email,
  );
  state.moduleLabPublicWorkspace = await createSharedWorkspaceForUser(state.moduleLabOperatorUser.id, runId, {
    isPublic: true,
    slugPrefix: "module-lab-public",
    namePrefix: "Module Lab Public Workspace",
  });
  state.moduleLabViewerUser.id = await createUser(
    state.moduleLabViewerUser.email,
    state.moduleLabViewerUser.password,
    true,
  );
  const moduleLabViewerPersonalWorkspaceId = await createPersonalWorkspaceForUser(
    state.moduleLabViewerUser.id,
    state.moduleLabViewerUser.email,
  );
  state.deletionValidationUser.id = await createUser(
    state.deletionValidationUser.email,
    state.deletionValidationUser.password,
    true,
  );
  await createPersonalWorkspaceForUser(
    state.deletionValidationUser.id,
    state.deletionValidationUser.email,
  );
  state.deletionUser.id = await createUser(
    state.deletionUser.email,
    state.deletionUser.password,
    true,
  );
  await createPersonalWorkspaceForUser(state.deletionUser.id, state.deletionUser.email);
  state.unconfirmedUser.id = await createUser(
    state.unconfirmedUser.email,
    state.unconfirmedUser.password,
    false,
  );
  await createPersonalWorkspaceForUser(state.unconfirmedUser.id, state.unconfirmedUser.email);

  await ensureAuthFixtureWorkspaceMemberships(state);
  await upsertWorkspaceModuleRole(
    moduleLabOperatorPersonalWorkspaceId,
    state.moduleLabOperatorUser.id,
    "module-lab",
    "operator",
  );
  await upsertWorkspaceModuleRole(
    moduleLabViewerPersonalWorkspaceId,
    state.moduleLabViewerUser.id,
    "module-lab",
    "viewer",
  );
  await upsertWorkspaceModuleRole(
    state.moduleLabPublicWorkspace.id,
    state.moduleLabOperatorUser.id,
    "module-lab",
    "operator",
  );
  await upsertWorkspaceModuleRole(
    state.moduleLabPublicWorkspace.id,
    state.moduleLabViewerUser.id,
    "module-lab",
    "viewer",
  );
  state.moduleLabRbacReady = true;

  await writeAuthFixtureState(state);

  return state;
}

export async function cleanupAuthFixtureUsers() {
  if (!hasSupabaseAdminEnv()) {
    await removeAuthFixtureState();
    return;
  }

  try {
    const state = await readAuthFixtureState();
    if (state.workspaceShared.id) {
      await deleteWorkspaceById(state.workspaceShared.id);
    }
    if (state.moduleLabPublicWorkspace.id) {
      await deleteWorkspaceById(state.moduleLabPublicWorkspace.id);
    }
    await deleteUserById(state.confirmedUser.id);
    await deleteUserById(state.resetUser.id);
    await deleteUserById(state.settingsUser.id);
    await deleteUserById(state.sessionUser.id);
    await deleteUserById(state.workspaceUser.id);
    await deleteUserById(state.appAdminUser.id);
    await deleteUserById(state.moduleLabOperatorUser.id);
    await deleteUserById(state.moduleLabViewerUser.id);
    await deleteUserById(state.deletionValidationUser.id);
    await deleteUserById(state.deletionUser.id);
    await deleteUserById(state.unconfirmedUser.id);
  } catch {
    // Ignore missing or already-cleaned state.
  } finally {
    await removeAuthFixtureState();
  }
}

export async function generatePasswordRecoveryLink(email: string, locale = "en") {
  const supabase = getSupabaseAdminClient();
  const redirectTo = `${getSiteUrl()}/auth/callback?next=/${locale}/reset-password`;
  const { data, error } = await withRetry(() =>
    supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo,
      },
    }),
  );

  if (error) {
    throw error;
  }

  const tokenHash = data.properties?.hashed_token;

  if (!tokenHash) {
    throw new Error("Supabase admin recovery link response did not include a hashed_token.");
  }

  return `${redirectTo}&type=recovery&token_hash=${encodeURIComponent(tokenHash)}`;
}

export async function confirmUserEmail(userId: string) {
  const supabase = getSupabaseAdminClient();

  const { error } = await withRetry(() =>
    supabase.auth.admin.updateUserById(userId, {
      email_confirm: true,
    }),
  );

  if (error) {
    throw error;
  }
}
