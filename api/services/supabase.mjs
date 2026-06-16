import { createClient } from "@supabase/supabase-js";

import { assertApiEnv, getApiConfig } from "../config.mjs";

const workspaceFileBaseSelect =
  "id, workspace_id, workspace_slug, original_name, stored_name, mime_type, size_bytes, kind, created_at, thumbnail_status, thumbnail_error, thumbnail_storage_key, thumbnail_mime_type, thumbnail_width, thumbnail_height, thumbnail_created_at";

function mapWorkspaceFileRecord(item) {
  return {
    id: item.id,
    workspaceId: item.workspace_id ?? null,
    workspaceSlug: item.workspace_slug,
    originalName: item.original_name,
    storedName: item.stored_name,
    mimeType: item.mime_type,
    sizeBytes: item.size_bytes,
    kind: item.kind,
    createdAt: item.created_at,
    thumbnailStatus: item.thumbnail_status ?? null,
    thumbnailError: item.thumbnail_error ?? null,
    thumbnail: item.thumbnail_storage_key
      ? {
          path: item.thumbnail_storage_key,
          mimeType: item.thumbnail_mime_type ?? "image/webp",
          width: item.thumbnail_width,
          height: item.thumbnail_height,
          createdAt: item.thumbnail_created_at ?? item.created_at,
        }
      : null,
  };
}

function mapWorkspaceSummaryRecord(item) {
  return {
    id: item.id ?? null,
    slug: item.slug,
    name: item.name,
    kind: item.kind,
    membershipRole: item.workspace_memberships?.[0]?.role ?? "member",
  };
}

function mapAdminWorkspaceRecord(item) {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    kind: item.kind,
    createdAt: item.created_at,
  };
}

function mapPublicWorkspaceRecord(item) {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    kind: item.kind,
  };
}

function mapWorkspaceModuleRoleRecord(item) {
  return {
    workspaceId: item.workspace_id,
    userId: item.user_id,
    moduleId: item.module_id,
    role: item.role,
  };
}

function slugifyWorkspaceName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "workspace";
}

function resolveWorkspaceRoleOrder(role) {
  if (role === "owner") {
    return 0;
  }

  if (role === "admin") {
    return 1;
  }

  return 2;
}

function normalizeAdminWorkspaceLimit(limit) {
  if (!Number.isInteger(limit)) {
    return 10;
  }

  return Math.min(Math.max(limit, 1), 50);
}

function assertAdminMembershipRole(role) {
  if (!["admin", "member"].includes(role)) {
    const error = new Error("The requested workspace member role is invalid.");
    error.code = "workspace_member_role_invalid";
    throw error;
  }
}

function assertAdminModuleRole({ moduleId, role }) {
  if (moduleId !== "module-lab" || !["viewer", "operator"].includes(role)) {
    const error = new Error("The requested workspace module role is invalid.");
    error.code = "workspace_module_role_invalid";
    throw error;
  }
}

function assertAdminModuleId(moduleId) {
  if (moduleId !== "module-lab") {
    const error = new Error("The requested workspace module is invalid.");
    error.code = "workspace_module_invalid";
    throw error;
  }
}


export function createApiServices(config = getApiConfig(), overrides = {}) {
  const resolvedConfig = assertApiEnv(config);

  const publicClient =
    overrides.publicClient ??
    createClient(resolvedConfig.supabaseUrl, resolvedConfig.supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

  const adminClient =
    overrides.adminClient ??
    createClient(
      resolvedConfig.supabaseUrl,
      resolvedConfig.supabaseServiceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

  async function getWorkspaceRecord(workspaceId) {
    const { data, error } = await adminClient
      .from("workspaces")
      .select("id, kind")
      .eq("id", workspaceId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  async function getWorkspaceMembershipRecord({ workspaceId, userId }) {
    const { data, error } = await adminClient
      .from("workspace_memberships")
      .select("id, workspace_id, user_id, role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  async function ensureOwnerManagedSharedWorkspace({ workspaceId, actorUserId }) {
    const actorMembership = await getWorkspaceMembershipRecord({
      workspaceId,
      userId: actorUserId,
    });

    if (!actorMembership || actorMembership.role !== "owner") {
      const error = new Error("The current user is not allowed to manage this workspace.");
      error.code = "workspace_member_access_denied";
      throw error;
    }

    const workspace = await getWorkspaceRecord(workspaceId);

    if (!workspace || workspace.kind !== "shared") {
      const error = new Error("Member management is supported only for shared workspaces.");
      error.code = "workspace_personal_membership_unsupported";
      throw error;
    }

    return {
      workspace,
      actorMembership,
    };
  }

  async function ensureOwnerOrAdminManagedSharedWorkspace({ workspaceId, actorUserId }) {
    const actorMembership = await getWorkspaceMembershipRecord({
      workspaceId,
      userId: actorUserId,
    });

    if (!actorMembership || !["owner", "admin"].includes(actorMembership.role)) {
      const error = new Error("The current user is not allowed to manage module access.");
      error.code = "workspace_module_role_access_denied";
      throw error;
    }

    const workspace = await getWorkspaceRecord(workspaceId);

    if (!workspace || workspace.kind !== "shared") {
      const error = new Error("Module role management is supported only for shared workspaces.");
      error.code = "workspace_personal_membership_unsupported";
      throw error;
    }

    return {
      workspace,
      actorMembership,
    };
  }

  async function findAuthUserByEmail(email) {
    const normalizedEmail = email.trim().toLowerCase();
    const perPage = 200;

    for (let page = 1; page <= 10; page += 1) {
      const { data, error } = await adminClient.auth.admin.listUsers({
        page,
        perPage,
      });

      if (error) {
        throw error;
      }

      const matchedUser =
        data?.users?.find((user) => user.email?.toLowerCase() === normalizedEmail) ?? null;

      if (matchedUser) {
        return matchedUser;
      }

      if (!data?.users || data.users.length < perPage) {
        break;
      }
    }

    return null;
  }

  async function buildWorkspaceMemberSummaryList(workspaceId) {
    const membershipResponse = await adminClient
      .from("workspace_memberships")
      .select("id, workspace_id, user_id, role, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true });

    if (membershipResponse.error) {
      throw membershipResponse.error;
    }

    const membershipRows = membershipResponse.data ?? [];
    const userIds = membershipRows.map((row) => row.user_id);
    const profileMap = new Map();

    if (userIds.length > 0) {
      const profileResponse = await adminClient
        .from("profiles")
        .select("id, username, full_name")
        .in("id", userIds);

      if (profileResponse.error) {
        throw profileResponse.error;
      }

      for (const profile of profileResponse.data ?? []) {
        profileMap.set(profile.id, profile);
      }
    }

    const authUserResults = await Promise.all(
      userIds.map(async (userId) => {
        const response = await adminClient.auth.admin.getUserById(userId);

        if (response.error) {
          return [userId, null];
        }

        return [userId, response.data.user?.email ?? null];
      }),
    );
    const emailByUserId = new Map(authUserResults);

    return [...membershipRows]
      .sort((left, right) => {
        const roleDifference =
          resolveWorkspaceRoleOrder(left.role) - resolveWorkspaceRoleOrder(right.role);

        if (roleDifference !== 0) {
          return roleDifference;
        }

        return left.created_at.localeCompare(right.created_at);
      })
      .map((membership) => {
        const profile = profileMap.get(membership.user_id);
        const email = emailByUserId.get(membership.user_id) ?? null;
        const displayName = profile?.full_name ?? profile?.username ?? email ?? "User";

        return {
          membershipId: membership.id,
          workspaceId: membership.workspace_id,
          userId: membership.user_id,
          role: membership.role,
          email,
          displayName,
        };
      });
  }

  return {
    async verifyAccessToken(accessToken) {
      const { data, error } = await publicClient.auth.getUser(accessToken);

      if (error || !data.user) {
        return null;
      }

      return {
        id: data.user.id,
        email: data.user.email ?? null,
      };
    },
    async deleteAccount(userId) {
      const { error } = await adminClient.auth.admin.deleteUser(userId);

      if (error) {
        throw error;
      }
    },
    async signOutEverywhere(accessToken) {
      const { error } = await adminClient.auth.admin.signOut(accessToken, "global");

      if (error) {
        throw error;
      }
    },
    async getPersonalWorkspace({ userId }) {
      const { data, error } = await adminClient
        .from("workspaces")
        .select("id, slug")
        .eq("kind", "personal")
        .eq("personal_owner_user_id", userId)
        .maybeSingle();

      if (error) {
        if (error.code === "42P01" || error.message?.includes("workspaces")) {
          return null;
        }

        throw error;
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        slug: data.slug,
      };
    },
    async listUserWorkspaces({ userId }) {
      const { data, error } = await adminClient
        .from("workspaces")
        .select("id, slug, name, kind, workspace_memberships!inner(role)")
        .eq("workspace_memberships.user_id", userId)
        .order("kind", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        if (
          error.code === "42P01" ||
          error.message?.includes("workspaces") ||
          error.message?.includes("workspace_memberships")
        ) {
          return [
            {
              id: null,
              slug: "default",
              name: "Personal workspace",
              kind: "personal",
              membershipRole: "owner",
            },
          ];
        }

        throw error;
      }

      if (!data || data.length === 0) {
        return [
          {
            id: null,
            slug: "default",
            name: "Personal workspace",
            kind: "personal",
            membershipRole: "owner",
          },
        ];
      }

      return data.map(mapWorkspaceSummaryRecord);
    },
    async createSharedWorkspace({ userId, name }) {
      const trimmedName = typeof name === "string" ? name.trim() : "";

      if (trimmedName.length < 2 || trimmedName.length > 120) {
        const error = new Error("The workspace name is invalid.");
        error.code = "workspace_name_invalid";
        throw error;
      }

      const slugBase = slugifyWorkspaceName(trimmedName);

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const slugSuffix = Math.random().toString(36).slice(2, 8);
        const slug = `${slugBase}-${slugSuffix}`.slice(0, 64);
        const workspaceResponse = await adminClient
          .from("workspaces")
          .insert({
            kind: "shared",
            slug,
            name: trimmedName,
          })
          .select("id, slug, name, kind")
          .single();

        if (workspaceResponse.error) {
          if (workspaceResponse.error.code === "23505" && workspaceResponse.error.message?.includes("workspaces_slug_key")) {
            continue;
          }

          throw workspaceResponse.error;
        }

        const membershipResponse = await adminClient
          .from("workspace_memberships")
          .insert({
            workspace_id: workspaceResponse.data.id,
            user_id: userId,
            role: "owner",
          });

        if (membershipResponse.error) {
          throw membershipResponse.error;
        }

        return {
          ...mapWorkspaceSummaryRecord({
            ...workspaceResponse.data,
            workspace_memberships: [{ role: "owner" }],
          }),
        };
      }

      const error = new Error("The workspace could not be created.");
      error.code = "workspace_create_failed";
      throw error;
    },
    async getPublicWorkspace({ workspaceId }) {
      const { data, error } = await adminClient
        .from("workspaces")
        .select("id, slug, name, kind, is_public")
        .eq("id", workspaceId)
        .eq("is_public", true)
        .maybeSingle();

      if (error) {
        if (
          error.code === "42P01" ||
          error.message?.includes("workspaces") ||
          error.message?.includes("is_public")
        ) {
          return null;
        }

        throw error;
      }

      return data ? mapPublicWorkspaceRecord(data) : null;
    },
    async resolveWorkspaceContext({ userId, workspaceId = null, workspaceSlug }) {
      if (workspaceId) {
        return {
          workspaceId,
          workspaceSlug,
        };
      }

      if (workspaceSlug !== "default") {
        return {
          workspaceId: null,
          workspaceSlug,
        };
      }

      const personalWorkspace = await this.getPersonalWorkspace({ userId });

      return {
        workspaceId: personalWorkspace?.id ?? null,
        workspaceSlug,
      };
    },
    async getWorkspaceMembershipRole({ workspaceId, userId }) {
      const { data, error } = await adminClient
        .from("workspace_memberships")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        if (error.code === "42P01" || error.message?.includes("workspace_memberships")) {
          return null;
        }

        throw error;
      }

      return typeof data?.role === "string" ? data.role : null;
    },
    async listWorkspaceMembers({ workspaceId, actorUserId }) {
      const actorRole = await this.getWorkspaceMembershipRole({
        workspaceId,
        userId: actorUserId,
      });

      if (!actorRole) {
        const error = new Error("The current user is not a member of this workspace.");
        error.code = "workspace_member_access_denied";
        throw error;
      }

      return await buildWorkspaceMemberSummaryList(workspaceId);
    },
    async listAdminWorkspaces({ limit = 10 } = {}) {
      const normalizedLimit = normalizeAdminWorkspaceLimit(limit);
      const { data, error } = await adminClient
        .from("workspaces")
        .select("id, slug, name, kind, created_at")
        .order("created_at", { ascending: true })
        .range(0, normalizedLimit - 1);

      if (error) {
        throw error;
      }

      return (data ?? []).map(mapAdminWorkspaceRecord);
    },
    async listAdminWorkspaceMembers({ workspaceId }) {
      return await buildWorkspaceMemberSummaryList(workspaceId);
    },
    async updateAdminWorkspaceMemberRole({ workspaceId, targetUserId, role }) {
      assertAdminMembershipRole(role);

      const targetMembership = await getWorkspaceMembershipRecord({
        workspaceId,
        userId: targetUserId,
      });

      if (!targetMembership) {
        const error = new Error("The requested workspace member was not found.");
        error.code = "workspace_member_not_found";
        throw error;
      }

      if (targetMembership.role === "owner") {
        const error = new Error("The workspace owner cannot be modified through this action.");
        error.code = "workspace_member_owner_protected";
        throw error;
      }

      const updateResponse = await adminClient
        .from("workspace_memberships")
        .update({ role })
        .eq("id", targetMembership.id);

      if (updateResponse.error) {
        throw updateResponse.error;
      }

      const members = await buildWorkspaceMemberSummaryList(workspaceId);
      return members.find((member) => member.userId === targetUserId) ?? null;
    },
    async listAdminWorkspaceModuleRoles({ workspaceId, moduleId }) {
      assertAdminModuleId(moduleId);

      const { data, error } = await adminClient
        .from("workspace_module_roles")
        .select("workspace_id, user_id, module_id, role")
        .eq("workspace_id", workspaceId)
        .eq("module_id", moduleId);

      if (error) {
        throw error;
      }

      return (data ?? []).map(mapWorkspaceModuleRoleRecord);
    },
    async updateAdminWorkspaceModuleRole({ workspaceId, targetUserId, moduleId, role }) {
      assertAdminModuleRole({ moduleId, role });

      const targetMembership = await getWorkspaceMembershipRecord({
        workspaceId,
        userId: targetUserId,
      });

      if (!targetMembership) {
        const error = new Error("The requested workspace member was not found.");
        error.code = "workspace_module_role_member_not_found";
        throw error;
      }

      const { data, error } = await adminClient
        .from("workspace_module_roles")
        .upsert(
          {
            workspace_id: workspaceId,
            user_id: targetUserId,
            module_id: moduleId,
            role,
          },
          { onConflict: "workspace_id,user_id,module_id" },
        )
        .select("workspace_id, user_id, module_id, role")
        .single();

      if (error) {
        throw error;
      }

      return mapWorkspaceModuleRoleRecord(data);
    },
    async deleteAdminWorkspaceModuleRole({ workspaceId, targetUserId, moduleId }) {
      assertAdminModuleId(moduleId);

      const targetMembership = await getWorkspaceMembershipRecord({
        workspaceId,
        userId: targetUserId,
      });

      if (!targetMembership) {
        const error = new Error("The requested workspace member was not found.");
        error.code = "workspace_module_role_member_not_found";
        throw error;
      }

      const { error } = await adminClient
        .from("workspace_module_roles")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("user_id", targetUserId)
        .eq("module_id", moduleId);

      if (error) {
        throw error;
      }
    },
    async listWorkspaceModuleRoles({ workspaceId, actorUserId, moduleId }) {
      const actorRole = await this.getWorkspaceMembershipRole({
        workspaceId,
        userId: actorUserId,
      });

      if (!actorRole) {
        const error = new Error("The current user is not a member of this workspace.");
        error.code = "workspace_module_role_access_denied";
        throw error;
      }

      const { data, error } = await adminClient
        .from("workspace_module_roles")
        .select("workspace_id, user_id, module_id, role")
        .eq("workspace_id", workspaceId)
        .eq("module_id", moduleId);

      if (error) {
        throw error;
      }

      return (data ?? []).map(mapWorkspaceModuleRoleRecord);
    },
    async updateWorkspaceModuleRole({ workspaceId, actorUserId, targetUserId, moduleId, role }) {
      await ensureOwnerOrAdminManagedSharedWorkspace({
        workspaceId,
        actorUserId,
      });

      const targetMembership = await getWorkspaceMembershipRecord({
        workspaceId,
        userId: targetUserId,
      });

      if (!targetMembership) {
        const error = new Error("The requested workspace member was not found.");
        error.code = "workspace_module_role_member_not_found";
        throw error;
      }

      const { data, error } = await adminClient
        .from("workspace_module_roles")
        .upsert(
          {
            workspace_id: workspaceId,
            user_id: targetUserId,
            module_id: moduleId,
            role,
          },
          { onConflict: "workspace_id,user_id,module_id" },
        )
        .select("workspace_id, user_id, module_id, role")
        .single();

      if (error) {
        throw error;
      }

      return mapWorkspaceModuleRoleRecord(data);
    },
    async removeWorkspaceModuleRole({ workspaceId, actorUserId, targetUserId, moduleId }) {
      await ensureOwnerOrAdminManagedSharedWorkspace({
        workspaceId,
        actorUserId,
      });

      const targetMembership = await getWorkspaceMembershipRecord({
        workspaceId,
        userId: targetUserId,
      });

      if (!targetMembership) {
        const error = new Error("The requested workspace member was not found.");
        error.code = "workspace_module_role_member_not_found";
        throw error;
      }

      const { error } = await adminClient
        .from("workspace_module_roles")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("user_id", targetUserId)
        .eq("module_id", moduleId);

      if (error) {
        throw error;
      }
    },
    async addWorkspaceMember({ workspaceId, actorUserId, email, role }) {
      await ensureOwnerManagedSharedWorkspace({
        workspaceId,
        actorUserId,
      });

      const authUser = await findAuthUserByEmail(email);

      if (!authUser?.id) {
        const error = new Error("No registered user was found for that email.");
        error.code = "workspace_member_user_not_found";
        throw error;
      }

      const existingMembership = await getWorkspaceMembershipRecord({
        workspaceId,
        userId: authUser.id,
      });

      if (existingMembership) {
        const error = new Error("That user is already a member of this workspace.");
        error.code = "workspace_member_exists";
        throw error;
      }

      const insertResponse = await adminClient
        .from("workspace_memberships")
        .insert({
          workspace_id: workspaceId,
          user_id: authUser.id,
          role,
        });

      if (insertResponse.error) {
        if (insertResponse.error.code === "23505") {
          const error = new Error("That user is already a member of this workspace.");
          error.code = "workspace_member_exists";
          throw error;
        }

        throw insertResponse.error;
      }

      const members = await buildWorkspaceMemberSummaryList(workspaceId);
      return members.find((member) => member.userId === authUser.id) ?? null;
    },
    async updateWorkspaceMemberRole({ workspaceId, actorUserId, targetUserId, role }) {
      await ensureOwnerManagedSharedWorkspace({
        workspaceId,
        actorUserId,
      });

      const targetMembership = await getWorkspaceMembershipRecord({
        workspaceId,
        userId: targetUserId,
      });

      if (!targetMembership) {
        const error = new Error("The requested workspace member was not found.");
        error.code = "workspace_member_not_found";
        throw error;
      }

      if (targetMembership.role === "owner") {
        const error = new Error("The workspace owner cannot be modified through this action.");
        error.code = "workspace_member_owner_protected";
        throw error;
      }

      const updateResponse = await adminClient
        .from("workspace_memberships")
        .update({ role })
        .eq("id", targetMembership.id);

      if (updateResponse.error) {
        throw updateResponse.error;
      }

      const members = await buildWorkspaceMemberSummaryList(workspaceId);
      return members.find((member) => member.userId === targetUserId) ?? null;
    },
    async removeWorkspaceMember({ workspaceId, actorUserId, targetUserId }) {
      await ensureOwnerManagedSharedWorkspace({
        workspaceId,
        actorUserId,
      });

      const targetMembership = await getWorkspaceMembershipRecord({
        workspaceId,
        userId: targetUserId,
      });

      if (!targetMembership) {
        const error = new Error("The requested workspace member was not found.");
        error.code = "workspace_member_not_found";
        throw error;
      }

      if (targetMembership.role === "owner") {
        const error = new Error("The workspace owner cannot be removed through this action.");
        error.code = "workspace_member_owner_protected";
        throw error;
      }

      const deleteResponse = await adminClient
        .from("workspace_memberships")
        .delete()
        .eq("id", targetMembership.id);

      if (deleteResponse.error) {
        throw deleteResponse.error;
      }

      const moduleRoleDeleteResponse = await adminClient
        .from("workspace_module_roles")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("user_id", targetUserId);

      if (moduleRoleDeleteResponse.error) {
        throw moduleRoleDeleteResponse.error;
      }
    },
    async transferWorkspaceOwnership({ workspaceId, actorUserId, newOwnerUserId }) {
      if (typeof adminClient.rpc === "function") {
        const { error } = await adminClient.rpc("transfer_workspace_ownership", {
          p_workspace_id: workspaceId,
          p_actor_user_id: actorUserId,
          p_new_owner_user_id: newOwnerUserId,
        });

        if (error) {
          throw error;
        }

        return;
      }

      const { actorMembership } = await ensureOwnerManagedSharedWorkspace({
        workspaceId,
        actorUserId,
      });

      const targetMembership = await getWorkspaceMembershipRecord({
        workspaceId,
        userId: newOwnerUserId,
      });

      if (!targetMembership || targetMembership.role === "owner") {
        const error = new Error("Ownership can be transferred only to another existing workspace member.");
        error.code = "workspace_transfer_invalid_target";
        throw error;
      }

      const transferResponse = await adminClient
        .from("workspace_memberships")
        .upsert(
          [
            {
              id: actorMembership.id,
              workspace_id: actorMembership.workspace_id,
              user_id: actorMembership.user_id,
              role: "admin",
            },
            {
              id: targetMembership.id,
              workspace_id: targetMembership.workspace_id,
              user_id: targetMembership.user_id,
              role: "owner",
            },
          ],
          { onConflict: "id" },
        );

      if (transferResponse.error) {
        throw transferResponse.error;
      }
    },
    async getUserWorkspaceModuleRole({ workspaceId, userId, moduleId }) {
      const { data, error } = await adminClient
        .from("workspace_module_roles")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
        .eq("module_id", moduleId)
        .maybeSingle();

      if (error) {
        if (error.code === "42P01" || error.message?.includes("workspace_module_roles")) {
          return null;
        }

        throw error;
      }

      return typeof data?.role === "string" ? data.role : null;
    },
    async listWorkspaceFiles({ workspaceId }) {
      const { data, error } = await adminClient
        .from("workspace_files")
        .select(workspaceFileBaseSelect)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []).map(mapWorkspaceFileRecord);
    },
    async createWorkspaceFile(file) {
      const { data, error } = await adminClient
        .from("workspace_files")
        .insert({
          user_id: file.userId,
          workspace_id: file.workspaceId,
          workspace_slug: file.workspaceSlug,
          storage_bucket: file.storageBucket,
          storage_key: file.storageKey,
          original_name: file.originalName,
          stored_name: file.storedName,
          mime_type: file.mimeType,
          size_bytes: file.sizeBytes,
          kind: file.kind,
          thumbnail_status: file.thumbnailStatus ?? null,
          thumbnail_error: file.thumbnailError ?? null,
        })
        .select(workspaceFileBaseSelect)
        .single();

      if (error) {
        throw error;
      }

      return mapWorkspaceFileRecord(data);
    },
    async findWorkspaceFile({ workspaceId = null, fileId }) {
      let query = adminClient
        .from("workspace_files")
        .select("id, workspace_id, workspace_slug, storage_bucket, storage_key, thumbnail_storage_key, thumbnail_mime_type, thumbnail_status, thumbnail_error")
        .eq("id", fileId);

      if (workspaceId) {
        query = query.eq("workspace_id", workspaceId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        workspaceId: data.workspace_id,
        workspaceSlug: data.workspace_slug,
        storageBucket: data.storage_bucket,
        storageKey: data.storage_key,
        thumbnailStorageKey: data.thumbnail_storage_key,
        thumbnailMimeType: data.thumbnail_mime_type,
        thumbnailStatus: data.thumbnail_status,
        thumbnailError: data.thumbnail_error,
      };
    },
    async getWorkspaceFileForThumbnail(fileId) {
      const { data, error } = await adminClient
        .from("workspace_files")
        .select("id, user_id, workspace_id, workspace_slug, storage_bucket, storage_key, mime_type, kind")
        .eq("id", fileId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        workspaceId: data.workspace_id,
        workspaceSlug: data.workspace_slug,
        storageBucket: data.storage_bucket,
        storageKey: data.storage_key,
        mimeType: data.mime_type,
        kind: data.kind,
      };
    },
    async updateWorkspaceFileThumbnail(fileId, thumbnail) {
      const { error } = await adminClient
        .from("workspace_files")
        .update({
          thumbnail_status: "completed",
          thumbnail_error: null,
          thumbnail_storage_key: thumbnail.storageKey,
          thumbnail_mime_type: thumbnail.mimeType,
          thumbnail_width: thumbnail.width,
          thumbnail_height: thumbnail.height,
          thumbnail_created_at: thumbnail.createdAt,
        })
        .eq("id", fileId);

      if (error) {
        throw error;
      }
    },
    async updateWorkspaceFileThumbnailState(fileId, thumbnailState) {
      const { error } = await adminClient
        .from("workspace_files")
        .update({
          thumbnail_status: thumbnailState.status,
          thumbnail_error: thumbnailState.error ?? null,
          ...(thumbnailState.clearThumbnail
            ? {
                thumbnail_storage_key: null,
                thumbnail_mime_type: null,
                thumbnail_width: null,
                thumbnail_height: null,
                thumbnail_created_at: null,
              }
            : {}),
        })
        .eq("id", fileId);

      if (error) {
        throw error;
      }
    },
    async deleteWorkspaceFile({ workspaceId, fileId }) {
      const { error } = await adminClient
        .from("workspace_files")
        .delete()
        .eq("id", fileId)
        .eq("workspace_id", workspaceId);

      if (error) {
        throw error;
      }
    },
  };
}
