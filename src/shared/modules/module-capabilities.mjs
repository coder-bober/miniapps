const moduleRoleCapabilityMap = {
  "module-lab": {
    viewer: ["module-lab.read"],
    operator: ["module-lab.read", "module-lab.run_job"],
  },
  "workspace-files": {},
};

const workspaceMembershipCapabilityMap = {
  "module-lab": {},
  "workspace-files": {
    owner: [
      "workspace-files.read",
      "workspace-files.upload",
      "workspace-files.delete",
    ],
    admin: [
      "workspace-files.read",
      "workspace-files.upload",
      "workspace-files.delete",
    ],
    member: [
      "workspace-files.read",
      "workspace-files.upload",
    ],
  },
};

export function getModuleRoleCapabilityMap() {
  return moduleRoleCapabilityMap;
}

export function getKnownModuleRoles(moduleId) {
  return Object.keys(moduleRoleCapabilityMap[moduleId] ?? {});
}

export function isKnownModuleRole(moduleId, role) {
  if (!role) {
    return false;
  }

  return Object.prototype.hasOwnProperty.call(moduleRoleCapabilityMap[moduleId] ?? {}, role);
}

export function resolveModuleCapabilities(moduleId, role) {
  if (!role) {
    return [];
  }

  const capabilities = moduleRoleCapabilityMap[moduleId]?.[role] ?? [];
  return [...new Set(capabilities)];
}

export function resolveDefaultWorkspaceMembershipCapabilities(moduleId, membershipRole) {
  if (!membershipRole) {
    return [];
  }

  const capabilities = workspaceMembershipCapabilityMap[moduleId]?.[membershipRole] ?? [];
  return [...new Set(capabilities)];
}

export function hasModuleCapability(capabilities, capability) {
  return capabilities.includes(capability);
}
