import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  isKnownModuleRole,
  resolveDefaultWorkspaceMembershipCapabilities,
  resolveModuleCapabilities,
  type ModuleAccess,
  type ModuleCapability,
} from "@/shared/modules/module-capabilities";
import {
  isWorkspaceMembershipRole,
  type WorkspaceMembershipRole,
  type WorkspaceModuleAccess,
} from "@/shared/workspaces/workspace-access";

export async function getCurrentUserModuleAccess(
  userId: string,
  moduleId: string,
): Promise<ModuleAccess> {
  void userId;

  return {
    moduleId,
    role: null,
    capabilities: [],
  };
}

export async function getCurrentUserWorkspaceModuleAccess(
  userId: string,
  workspaceId: string | null,
  moduleId: string,
): Promise<WorkspaceModuleAccess> {
  if (!workspaceId) {
    return {
      workspaceId: null,
      membershipRole: null,
      moduleRole: null,
      capabilities: [],
    };
  }

  const supabase = await createSupabaseServerClient();
  const membershipResponse = await supabase
    .from("workspace_memberships")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipResponse.error) {
    throw membershipResponse.error;
  }

  const membershipRole =
    typeof membershipResponse.data?.role === "string" &&
    isWorkspaceMembershipRole(membershipResponse.data.role)
      ? (membershipResponse.data.role as WorkspaceMembershipRole)
      : null;

  if (!membershipRole) {
    return {
      workspaceId,
      membershipRole: null,
      moduleRole: null,
      capabilities: [],
    };
  }

  const moduleRoleResponse = await supabase
    .from("workspace_module_roles")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("module_id", moduleId)
    .maybeSingle();

  if (moduleRoleResponse.error) {
    throw moduleRoleResponse.error;
  }

  const moduleRole =
    typeof moduleRoleResponse.data?.role === "string" &&
    isKnownModuleRole(moduleId, moduleRoleResponse.data.role)
      ? (moduleRoleResponse.data.role as WorkspaceModuleAccess["moduleRole"])
      : null;

  const defaultCapabilities = resolveDefaultWorkspaceMembershipCapabilities(
    moduleId,
    membershipRole,
  ) as ModuleCapability[];
  const moduleCapabilities = resolveModuleCapabilities(moduleId, moduleRole) as ModuleCapability[];

  return {
    workspaceId,
    membershipRole,
    moduleRole,
    capabilities: [...new Set([...defaultCapabilities, ...moduleCapabilities])],
  };
}
