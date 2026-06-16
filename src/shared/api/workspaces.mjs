import { z } from "zod";

import { workspaceIdSchema, workspaceSlugSchema } from "./workspace-files.mjs";

export const workspaceKindSchema = z.enum(["personal", "shared"]);
export const workspaceMembershipRoleSchema = z.enum(["owner", "admin", "member"]);

export const workspaceSummarySchema = z.object({
  id: workspaceIdSchema.nullable(),
  slug: workspaceSlugSchema,
  name: z.string(),
  kind: workspaceKindSchema,
  membershipRole: workspaceMembershipRoleSchema,
});

export const workspaceMemberSummarySchema = z.object({
  membershipId: z.string().trim().min(1),
  workspaceId: workspaceIdSchema,
  userId: z.string().trim().min(1),
  role: workspaceMembershipRoleSchema,
  email: z.string().email().nullable(),
  displayName: z.string(),
});

export const workspaceModuleRoleSummarySchema = z.object({
  workspaceId: workspaceIdSchema,
  userId: z.string().trim().min(1),
  moduleId: z.literal("module-lab"),
  role: z.enum(["viewer", "operator"]).nullable(),
});

export const publicWorkspaceSummarySchema = workspaceSummarySchema.omit({
  membershipRole: true,
  id: true,
}).extend({
  id: workspaceIdSchema,
});

export const workspaceListResponseSchema = z.object({
  workspaces: z.array(workspaceSummarySchema),
});

export const workspaceMemberListResponseSchema = z.object({
  members: z.array(workspaceMemberSummarySchema),
});

export const workspaceModuleRoleListResponseSchema = z.object({
  moduleRoles: z.array(workspaceModuleRoleSummarySchema),
});

export const addWorkspaceMemberRequestSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["admin", "member"]),
});

export const addWorkspaceMemberResponseSchema = z.object({
  member: workspaceMemberSummarySchema,
});

export const updateWorkspaceMemberRoleRequestSchema = z.object({
  role: z.enum(["admin", "member"]),
});

export const updateWorkspaceMemberRoleResponseSchema = z.object({
  member: workspaceMemberSummarySchema,
});

export const updateWorkspaceModuleRoleRequestSchema = z.object({
  role: z.enum(["viewer", "operator"]),
});

export const updateWorkspaceModuleRoleResponseSchema = z.object({
  moduleRole: workspaceModuleRoleSummarySchema,
});

export const removeWorkspaceModuleRoleResponseSchema = z.object({
  ok: z.literal(true),
});

export const removeWorkspaceMemberResponseSchema = z.object({
  ok: z.literal(true),
});

export const transferWorkspaceOwnershipRequestSchema = z.object({
  newOwnerUserId: z.string().trim().min(1),
});

export const transferWorkspaceOwnershipResponseSchema = z.object({
  ok: z.literal(true),
});

export const createWorkspaceRequestSchema = z.object({
  name: z.string().trim().min(2).max(120),
});

export const createWorkspaceResponseSchema = z.object({
  workspace: workspaceSummarySchema,
});

export const publicWorkspaceLookupResponseSchema = z.object({
  workspace: publicWorkspaceSummarySchema,
});

export const workspaceErrorResponseSchema = z.object({
  error: z.enum([
    "invalid_session",
    "workspace_list_failed",
    "workspace_create_failed",
    "workspace_name_invalid",
    "workspace_member_access_denied",
    "workspace_member_list_failed",
    "workspace_member_email_invalid",
    "workspace_member_role_invalid",
    "workspace_member_exists",
    "workspace_member_user_not_found",
    "workspace_member_not_found",
    "workspace_member_owner_protected",
    "workspace_member_add_failed",
    "workspace_member_update_failed",
    "workspace_member_remove_failed",
    "workspace_module_role_access_denied",
    "workspace_module_role_list_failed",
    "workspace_module_role_invalid",
    "workspace_module_role_member_not_found",
    "workspace_module_role_update_failed",
    "workspace_module_role_remove_failed",
    "workspace_transfer_invalid_target",
    "workspace_transfer_failed",
    "workspace_personal_membership_unsupported",
  ]),
  message: z.string(),
});

export const publicWorkspaceErrorResponseSchema = z.object({
  error: z.enum(["workspace_not_found", "workspace_lookup_failed"]),
  message: z.string(),
});
