import type { Metadata } from "next";

import { HomePage } from "@/components/marketing/home-page";
import { getAuthenticatedUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/dictionaries";
import {
  defaultLocale,
  isSupportedLocale,
  locales,
  siteUrl,
  type Locale,
} from "@/lib/i18n/config";

type LocalizedPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export async function generateMetadata({
  params,
}: LocalizedPageProps): Promise<Metadata> {
  const { locale } = await params;
  const resolvedLocale: Locale = isSupportedLocale(locale) ? locale : defaultLocale;
  const dictionary = getDictionary(resolvedLocale);
  const languages = Object.fromEntries(
    locales.map((item) => [item, `/${item}`]),
  );

  return {
    title: dictionary.seo.title,
    description: dictionary.seo.description,
    keywords:
      resolvedLocale === "ru"
        ? [
            "SaaS аналитика",
            "операции SaaS",
            "churn risk",
            "customer success",
            "revenue operations",
          ]
        : [
            "SaaS analytics",
            "SaaS operations",
            "churn risk",
            "customer success",
            "revenue operations",
          ],
    alternates: {
      canonical: `/${resolvedLocale}`,
      languages,
    },
    openGraph: {
      title: dictionary.seo.title,
      description: dictionary.seo.description,
      url: `${siteUrl}/${resolvedLocale}`,
      siteName: "QuietShift",
      locale: resolvedLocale === "ru" ? "ru_RU" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: dictionary.seo.title,
      description: dictionary.seo.description,
    },
  };
}

export default async function LocalizedHomePage({ params }: LocalizedPageProps) {
  const { locale } = await params;
  const resolvedLocale: Locale = isSupportedLocale(locale) ? locale : defaultLocale;
  const dictionary = getDictionary(resolvedLocale);
  const user = await getAuthenticatedUser();

  return (
    <HomePage
      dictionary={dictionary}
      locale={resolvedLocale}
      user={user}
    />
  );
}
