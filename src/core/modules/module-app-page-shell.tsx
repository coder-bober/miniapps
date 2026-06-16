import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { AppPageShell } from "@/components/app/app-page-shell";
import type { Locale } from "@/lib/i18n/config";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";
import { getAppModuleSurface } from "@/modules/registry";
import { isModuleEnabled } from "@/shared/modules/enabled-modules";
import type { AuthenticatedUser } from "@/types/auth";

type ModuleAppPageShellProps = {
  moduleId: string;
  locale: Locale;
  dictionary: SiteDictionary;
  user: AuthenticatedUser;
  children?: ReactNode;
};

export function ModuleAppPageShell({
  moduleId,
  locale,
  dictionary,
  user,
  children,
}: ModuleAppPageShellProps) {
  if (!isModuleEnabled(moduleId)) {
    notFound();
  }

  const appSurface = getAppModuleSurface(moduleId, dictionary);

  if (!appSurface) {
    notFound();
  }

  return (
    <AppPageShell
      locale={locale}
      dictionary={dictionary}
      eyebrow={appSurface.eyebrow}
      title={appSurface.title}
      description={appSurface.description}
      highlights={appSurface.highlights}
      user={user}
    >
      {children}
    </AppPageShell>
  );
}
