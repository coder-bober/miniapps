import { Box, Container } from "@mantine/core";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requestPasswordResetAction } from "@/app/[locale]/auth-actions";
import { EmailActionCard } from "@/components/auth/email-action-card";
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
    title: `QuietShift | ${dictionary.auth.forgotPassword.title}`,
    description: dictionary.auth.forgotPassword.description,
    robots: {
      index: false,
      follow: false,
    },
    alternates: {
      canonical: `/${resolvedLocale}/forgot-password`,
    },
    openGraph: {
      title: `QuietShift | ${dictionary.auth.forgotPassword.title}`,
      description: dictionary.auth.forgotPassword.description,
      url: `${siteUrl}/${resolvedLocale}/forgot-password`,
      siteName: "QuietShift",
      locale: resolvedLocale === "ru" ? "ru_RU" : "en_US",
      type: "website",
    },
  };
}

export default async function ForgotPasswordPage({ params, searchParams }: PageProps) {
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
        <EmailActionCard
          locale={resolvedLocale}
          title={dictionary.auth.forgotPassword.title}
          description={dictionary.auth.forgotPassword.description}
          submitLabel={dictionary.auth.forgotPassword.submit}
          emailLabel={dictionary.auth.fields.email}
          action={requestPasswordResetAction}
          email={resolvedSearchParams.email}
          error={resolvedSearchParams.error}
          message={resolvedSearchParams.message}
          footerLinks={[
            { href: `/${resolvedLocale}/sign-in`, label: dictionary.auth.actions.backToSignIn },
          ]}
        />
      </Container>
    </Box>
  );
}
