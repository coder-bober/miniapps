import type { Metadata } from "next";

import { ProfileFormCard } from "@/components/profile/profile-form-card";
import { updateProfileAction } from "@/app/[locale]/(app)/profile-actions";
import { CoreAppPageShell } from "@/core/pages/core-app-page-shell";
import {
  generateAuthenticatedAppPageMetadata,
  renderAuthenticatedAppPage,
} from "@/core/routes/authenticated-app-route";

type PageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return generateAuthenticatedAppPageMetadata({
    params,
    canonicalPath: (locale) => `/${locale}/profile`,
    resolveMetadata(dictionary) {
      return {
        title: dictionary.app.profile.title,
        description: dictionary.app.profile.description,
      };
    },
  });
}

export default async function ProfilePage({ params, searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;

  return renderAuthenticatedAppPage({
    params,
    signInPath: (locale) => `/${locale}/sign-in`,
    render: ({ locale, dictionary, user }) => (
      <CoreAppPageShell
        locale={locale}
        dictionary={dictionary}
        user={user}
        surface={{
          eyebrow: dictionary.app.profile.eyebrow,
          title: dictionary.app.profile.title,
          description: dictionary.app.profile.description,
          highlights: dictionary.app.profile.highlights,
        }}
      >
        <ProfileFormCard
          dictionary={dictionary.app.profile.form}
          locale={locale}
          user={user}
          action={updateProfileAction}
          error={resolvedSearchParams.error}
          message={resolvedSearchParams.message}
        />
      </CoreAppPageShell>
    ),
  });
}
