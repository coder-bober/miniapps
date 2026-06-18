export function getEnabledModulesForSuite() {
  const enabledModules = process.env.ENABLED_MODULES;

  if (enabledModules === undefined) {
    return null;
  }

  return enabledModules
    .split(",")
    .map((moduleId) => moduleId.trim())
    .filter(Boolean);
}

export function isModuleEnabledForSuite(
  moduleId: string,
  { defaultWhenUnset = true }: { defaultWhenUnset?: boolean } = {},
) {
  const enabledModules = getEnabledModulesForSuite();

  if (enabledModules === null) {
    return defaultWhenUnset;
  }

  return enabledModules.includes(moduleId);
}

export function isModuleExplicitlyDisabledForSuite(moduleId: string) {
  const enabledModules = getEnabledModulesForSuite();

  return enabledModules !== null && !enabledModules.includes(moduleId);
}
