import type { Locale } from "@/lib/i18n/config";
import type { AppModuleManifest } from "@/shared/modules/module-manifest";
import type { ModuleNavItem } from "@/shared/modules/module-manifest";

import { getAppModules } from "@/modules/registry";

export type LocalizedModuleNavItem = {
  id: string;
  label: string;
  href: string;
  area: ModuleNavItem["area"];
};

export function getModuleNavItems(
  area: ModuleNavItem["area"],
  locale: Locale,
): LocalizedModuleNavItem[] {
  return getAppModules().flatMap((module: AppModuleManifest) =>
    (module.navItems ?? [])
      .filter((navItem: ModuleNavItem) => navItem.area === area)
      .map((navItem: ModuleNavItem) => ({
        id: navItem.id,
        label: navItem.labels[locale] ?? navItem.labels.en,
        href: localizeModuleHref(navItem.href, locale),
        area: navItem.area,
      })),
  );
}

function localizeModuleHref(href: string, locale: Locale) {
  if (href.startsWith(`/${locale}`)) {
    return href;
  }

  return `/${locale}${href.startsWith("/") ? href : `/${href}`}`;
}
