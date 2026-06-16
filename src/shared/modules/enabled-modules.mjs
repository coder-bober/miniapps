function normalizeModuleId(moduleId) {
  return moduleId.trim();
}

export function getEnabledModuleIds() {
  const hasEnabledModulesEnv = Object.prototype.hasOwnProperty.call(
    process.env,
    "ENABLED_MODULES",
  );

  if (!hasEnabledModulesEnv) {
    return null;
  }

  const rawValue = process.env.ENABLED_MODULES?.trim() ?? "";

  if (!rawValue) {
    return [];
  }

  const moduleIds = rawValue
    .split(",")
    .map((moduleId) => normalizeModuleId(moduleId))
    .filter(Boolean);

  return [...new Set(moduleIds)];
}

export function isModuleEnabled(moduleId) {
  const enabledModuleIds = getEnabledModuleIds();

  if (!enabledModuleIds) {
    return true;
  }

  return enabledModuleIds.includes(moduleId);
}

export function filterEnabledModules(modules) {
  return modules.filter((module) => isModuleEnabled(module.id));
}
