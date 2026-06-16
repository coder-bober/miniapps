import type { Locale } from "@/lib/i18n/config";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";
import { getModuleNavItems } from "@/modules/navigation";

export type AppNavigationItem = {
  id: string;
  label: string;
  href: string;
};

export function getAppNavigation(
  locale: Locale,
  dictionary: SiteDictionary,
): AppNavigationItem[] {
  const coreItems: AppNavigationItem[] = [
    {
      id: "profile",
      label: dictionary.header.user.profile,
      href: `/${locale}/profile`,
    },
    {
      id: "settings",
      label: dictionary.header.user.settings,
      href: `/${locale}/settings`,
    },
  ];

  const moduleItems = getModuleNavItems("app", locale).map(({ id, label, href }) => ({
    id,
    label,
    href,
  }));

  return [...coreItems, ...moduleItems];
}
