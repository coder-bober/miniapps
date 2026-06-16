import { assertTestStorageIsolation } from "./assert-test-storage-isolation.mjs";
import { loadEnvFiles } from "./load-env.mjs";

export function loadE2EEnv() {
  assertTestStorageIsolation();
  const explicitEnabledModules = process.env.ENABLED_MODULES;
  loadEnvFiles([".env.e2e.local", ".env.api.e2e.local"], { override: true });

  if (explicitEnabledModules !== undefined) {
    process.env.ENABLED_MODULES = explicitEnabledModules;
  }
}
