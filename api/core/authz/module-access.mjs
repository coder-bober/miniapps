import {
  isKnownModuleRole,
  resolveDefaultWorkspaceMembershipCapabilities,
  resolveModuleCapabilities,
} from "../../../src/shared/modules/module-capabilities.mjs";
import {
  isWorkspaceMembershipRole,
} from "../../../src/shared/workspaces/workspace-access.mjs";

export async function getUserModuleAccess({ services, userId, moduleId }) {
  void services;
  void userId;
  const role = null;

  return {
    moduleId,
    role: null,
    capabilities: resolveModuleCapabilities(moduleId, role),
  };
}

export async function getUserWorkspaceModuleAccess({
  services,
  userId,
  workspaceId,
  moduleId,
}) {
  if (!workspaceId || typeof services.getWorkspaceMembershipRole !== "function") {
    return {
      workspaceId: workspaceId ?? null,
      membershipRole: null,
      moduleRole: null,
      capabilities: [],
    };
  }

  const membershipRole = await services.getWorkspaceMembershipRole({
    workspaceId,
    userId,
  });

  if (typeof membershipRole !== "string" || !isWorkspaceMembershipRole(membershipRole)) {
    return {
      workspaceId,
      membershipRole: null,
      moduleRole: null,
      capabilities: [],
    };
  }

  let moduleRole = null;

  if (typeof services.getUserWorkspaceModuleRole === "function") {
    moduleRole = await services.getUserWorkspaceModuleRole({
      workspaceId,
      userId,
      moduleId,
    });
  }

  return {
    workspaceId,
    membershipRole,
    moduleRole: typeof moduleRole === "string" && isKnownModuleRole(moduleId, moduleRole)
      ? moduleRole
      : null,
    capabilities: [
      ...new Set([
        ...resolveDefaultWorkspaceMembershipCapabilities(moduleId, membershipRole),
        ...resolveModuleCapabilities(moduleId, moduleRole),
      ]),
    ],
  };
}

export function sendModuleCapabilityRequired(reply, capability) {
  return reply.code(403).send({
    error: "module_capability_required",
    message: "The current user lacks the required module capability.",
    requiredCapability: capability,
  });
}
