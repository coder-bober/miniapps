import { Box, Container } from "@mantine/core";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { signUpAction } from "@/app/[locale]/auth-actions";
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
    title: `QuietShift | ${dictionary.auth.signUp.title}`,
    description: dictionary.auth.signUp.description,
    robots: {
      index: false,
      follow: false,
    },
    alternates: {
      canonical: `/${resolvedLocale}/sign-up`,
    },
    openGraph: {
      title: `QuietShift | ${dictionary.auth.signUp.title}`,
      description: dictionary.auth.signUp.description,
      url: `${siteUrl}/${resolvedLocale}/sign-up`,
      siteName: "QuietShift",
      locale: resolvedLocale === "ru" ? "ru_RU" : "en_US",
      type: "website",
    },
  };
}

export default async function SignUpPage({ params, searchParams }: PageProps) {
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
          mode="sign-up"
          action={signUpAction}
          error={resolvedSearchParams.error}
          message={resolvedSearchParams.message}
        />
      </Container>
    </Box>
  );
}
