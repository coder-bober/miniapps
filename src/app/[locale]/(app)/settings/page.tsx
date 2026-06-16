import type { Metadata } from "next";

import {
  changePasswordAction,
  deleteAccountAction,
  signOutEverywhereAction,
} from "@/app/[locale]/(app)/settings-actions";
import {
  generateAuthenticatedAppPageMetadata,
  renderAuthenticatedAppPage,
} from "@/core/routes/authenticated-app-route";
import { CoreAppPageShell } from "@/core/pages/core-app-page-shell";
import { SettingsPageContent } from "@/components/settings/settings-page-content";
import { resolveSettingsPageState } from "@/lib/settings/page-state";

type PageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    passwordError?: string;
    passwordMessage?: string;
    sessionError?: string;
    deleteError?: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return generateAuthenticatedAppPageMetadata({
    params,
    canonicalPath: (locale) => `/${locale}/settings`,
    resolveMetadata(dictionary) {
      return {
        title: dictionary.app.settings.title,
        description: dictionary.app.settings.description,
      };
    },
  });
}

export default async function SettingsPage({ params, searchParams }: PageProps) {
  const status = resolveSettingsPageState(await searchParams);

  return renderAuthenticatedAppPage({
    params,
    signInPath: (locale) => `/${locale}/sign-in`,
    render: ({ locale, dictionary, user }) => (
      <CoreAppPageShell
        locale={locale}
        dictionary={dictionary}
        user={user}
        surface={{
          eyebrow: dictionary.app.settings.eyebrow,
          title: dictionary.app.settings.title,
          description: dictionary.app.settings.description,
          highlights: dictionary.app.settings.highlights,
        }}
      >
        <SettingsPageContent
          locale={locale}
          dictionary={dictionary}
          user={user}
          status={status}
          changePasswordAction={changePasswordAction}
          signOutEverywhereAction={signOutEverywhereAction}
          deleteAccountAction={deleteAccountAction}
        />
      </CoreAppPageShell>
    ),
  });
}
