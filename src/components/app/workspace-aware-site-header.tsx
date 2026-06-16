"use client";

import { useWorkspaceShellContext } from "@/core/workspaces/workspace-shell-context";
import type { Locale } from "@/lib/i18n/config";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";
import type { LocalizedModuleNavItem } from "@/modules/navigation";
import { SiteHeader } from "@/components/site-header";
import type { AuthenticatedUser } from "@/types/auth";

type WorkspaceAwareSiteHeaderProps = {
  dictionary: SiteDictionary;
  locale: Locale;
  user: AuthenticatedUser;
  marketingModuleLinks: LocalizedModuleNavItem[];
  appModuleLinks: LocalizedModuleNavItem[];
};

export function WorkspaceAwareSiteHeader({
  dictionary,
  locale,
  user,
  marketingModuleLinks,
  appModuleLinks,
}: WorkspaceAwareSiteHeaderProps) {
  const { currentWorkspace } = useWorkspaceShellContext();
  const workspaceAwareAppModuleLinks = appModuleLinks.map((item) => {
    if (item.id !== "module-lab" || !currentWorkspace?.id) {
      return item;
    }

    const [path, query = ""] = item.href.split("?");
    const params = new URLSearchParams(query);
    params.set("bbb", currentWorkspace.id);

    return {
      ...item,
      href: `${path}?${params.toString()}`,
    };
  });

  return (
    <SiteHeader
      dictionary={dictionary.header}
      locale={locale}
      user={user}
      marketingModuleLinks={marketingModuleLinks}
      appModuleLinks={workspaceAwareAppModuleLinks}
    />
  );
}
