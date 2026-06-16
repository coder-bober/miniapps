import type { ReactNode } from "react";

import { AppPageShell } from "@/components/app/app-page-shell";
import type { Locale } from "@/lib/i18n/config";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";
import type { AuthenticatedUser } from "@/types/auth";

type CoreAppPageSurface = {
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
};

type CoreAppPageShellProps = {
  locale: Locale;
  dictionary: SiteDictionary;
  user: AuthenticatedUser;
  surface: CoreAppPageSurface;
  children?: ReactNode;
};

export function CoreAppPageShell({
  locale,
  dictionary,
  user,
  surface,
  children,
}: CoreAppPageShellProps) {
  return (
    <AppPageShell
      locale={locale}
      dictionary={dictionary}
      eyebrow={surface.eyebrow}
      title={surface.title}
      description={surface.description}
      highlights={surface.highlights}
      user={user}
    >
      {children}
    </AppPageShell>
  );
}
