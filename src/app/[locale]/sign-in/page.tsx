import { Box, Container } from "@mantine/core";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { signInAction } from "@/app/[locale]/auth-actions";
import { AuthFormCard } from "@/components/auth/auth-form-card";
import { getAuthenticatedUser } from "@/lib/auth";
import { defaultLocale, isSupportedLocale, siteUrl, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

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
  const { locale } = await params;
  const resolvedLocale: Locale = isSupportedLocale(locale) ? locale : defaultLocale;
  const dictionary = getDictionary(resolvedLocale);

  return {
    title: `QuietShift | ${dictionary.auth.signIn.title}`,
    description: dictionary.auth.signIn.description,
    robots: {
      index: false,
      follow: false,
    },
    alternates: {
      canonical: `/${resolvedLocale}/sign-in`,
    },
    openGraph: {
      title: `QuietShift | ${dictionary.auth.signIn.title}`,
      description: dictionary.auth.signIn.description,
      url: `${siteUrl}/${resolvedLocale}/sign-in`,
      siteName: "QuietShift",
      locale: resolvedLocale === "ru" ? "ru_RU" : "en_US",
      type: "website",
    },
  };
}

export default async function SignInPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const resolvedLocale: Locale = isSupportedLocale(locale) ? locale : defaultLocale;
  const dictionary = getDictionary(resolvedLocale);
  const user = await getAuthenticatedUser();
  const resolvedSearchParams = await searchParams;

  if (user) {
    redirect(`/${resolvedLocale}/workspace`);
  }

  return (
    <Box component="main" py={48}>
      <Container size={520}>
        <AuthFormCard
          locale={resolvedLocale}
          dictionary={dictionary.auth}
          mode="sign-in"
          action={signInAction}
          error={resolvedSearchParams.error}
          message={resolvedSearchParams.message}
        />
      </Container>
    </Box>
  );
}
