import type { AppModuleManifest } from "@/shared/modules/module-manifest";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";
import { filterEnabledModules, isModuleEnabled } from "@/shared/modules/enabled-modules";

import { workspaceFilesModule } from "@/modules/workspace-files/manifest";
import { moduleLabModule } from "@/modules/module-lab/manifest";

const registeredAppModules: AppModuleManifest[] = [workspaceFilesModule, moduleLabModule];

export function getAppModules() {
  return filterEnabledModules(registeredAppModules);
}

export const appModules = getAppModules();

export function getAppModuleById(moduleId: string) {
  if (!isModuleEnabled(moduleId)) {
    return null;
  }

  return getAppModules().find((module: AppModuleManifest) => module.id === moduleId) ?? null;
}

export function getAppModuleSurface(moduleId: string, dictionary: SiteDictionary) {
  const appModule = getAppModuleById(moduleId);

  return appModule?.resolveAppSurface?.(dictionary) ?? null;
}

export function getAppModulePageMetadata(moduleId: string, dictionary: SiteDictionary) {
  const appModule = getAppModuleById(moduleId);

  return appModule?.resolveAppPageMetadata?.(dictionary) ?? null;
}

export function getPublicModuleSurface(moduleId: string, dictionary: SiteDictionary) {
  const appModule = getAppModuleById(moduleId);

  return appModule?.resolvePublicSurface?.(dictionary) ?? null;
}

export function getPublicModulePageMetadata(moduleId: string, dictionary: SiteDictionary) {
  const appModule = getAppModuleById(moduleId);

  return appModule?.resolvePublicPageMetadata?.(dictionary) ?? null;
}

export function getPublicModulePaths() {
  return getAppModules()
    .filter(
      (module: AppModuleManifest) =>
        typeof module.publicPath === "string" && module.publicPath.length > 0,
    )
    .map((module: AppModuleManifest) => ({
      id: module.id,
      path: module.publicPath as string,
    }));
}
