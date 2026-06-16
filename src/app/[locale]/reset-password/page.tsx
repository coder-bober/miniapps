import { Box, Container } from "@mantine/core";
import type { Metadata } from "next";

import { updatePasswordAction } from "@/app/[locale]/auth-actions";
import { ResetPasswordCard } from "@/components/auth/reset-password-card";
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
    title: `QuietShift | ${dictionary.auth.resetPassword.title}`,
    description: dictionary.auth.resetPassword.description,
    robots: {
      index: false,
      follow: false,
    },
    alternates: {
      canonical: `/${resolvedLocale}/reset-password`,
    },
    openGraph: {
      title: `QuietShift | ${dictionary.auth.resetPassword.title}`,
      description: dictionary.auth.resetPassword.description,
      url: `${siteUrl}/${resolvedLocale}/reset-password`,
      siteName: "QuietShift",
      locale: resolvedLocale === "ru" ? "ru_RU" : "en_US",
      type: "website",
    },
  };
}

export default async function ResetPasswordPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const resolvedLocale: Locale = isSupportedLocale(locale) ? locale : defaultLocale;
  const dictionary = getDictionary(resolvedLocale);
  const resolvedSearchParams = await searchParams;

  return (
    <Box component="main" py={48}>
      <Container size={520}>
        <ResetPasswordCard
          locale={resolvedLocale}
          dictionary={dictionary.auth}
          action={updatePasswordAction}
          error={resolvedSearchParams.error}
          message={resolvedSearchParams.message}
        />
      </Container>
    </Box>
  );
}
