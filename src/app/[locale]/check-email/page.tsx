import { Box, Container } from "@mantine/core";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { resendConfirmationAction } from "@/app/[locale]/auth-actions";
import { CheckEmailCard } from "@/components/auth/check-email-card";
import { getAuthenticatedUser } from "@/lib/auth";
import { defaultLocale, isSupportedLocale, siteUrl, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

type PageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    email?: string;
    error?: string;
    message?: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const resolvedLocale: Locale = isSupportedLocale(locale) ? locale : defaultLocale;
  const dictionary = getDictionary(resolvedLocale);

  return {
    title: `QuietShift | ${dictionary.auth.checkEmail.title}`,
    description: dictionary.auth.checkEmail.description,
    robots: {
      index: false,
      follow: false,
    },
    alternates: {
      canonical: `/${resolvedLocale}/check-email`,
    },
    openGraph: {
      title: `QuietShift | ${dictionary.auth.checkEmail.title}`,
      description: dictionary.auth.checkEmail.description,
      url: `${siteUrl}/${resolvedLocale}/check-email`,
      siteName: "QuietShift",
      locale: resolvedLocale === "ru" ? "ru_RU" : "en_US",
      type: "website",
    },
  };
}

export default async function CheckEmailPage({ params, searchParams }: PageProps) {
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
        <CheckEmailCard
          locale={resolvedLocale}
          dictionary={dictionary.auth}
          action={resendConfirmationAction}
          email={resolvedSearchParams.email}
          error={resolvedSearchParams.error}
          message={resolvedSearchParams.message}
        />
      </Container>
    </Box>
  );
}
