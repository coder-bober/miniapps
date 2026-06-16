import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getAuthenticatedUser } from "@/lib/auth";
import {
  defaultLocale,
  isSupportedLocale,
  siteUrl,
  type Locale,
} from "@/lib/i18n/config";
import { getDictionary, type SiteDictionary } from "@/lib/i18n/dictionaries";
import type { AuthenticatedUser } from "@/types/auth";

type LocalizedParams = Promise<{
  locale: string;
}>;

export type AuthenticatedAppRouteContext = {
  locale: Locale;
  dictionary: SiteDictionary;
  user: AuthenticatedUser;
};

type AppPageMetadataShape = {
  title: string;
  description: string;
};

type GenerateAuthenticatedAppPageMetadataOptions = {
  params: LocalizedParams;
  canonicalPath: (locale: Locale) => string;
  resolveMetadata: (dictionary: SiteDictionary) => AppPageMetadataShape;
};

type RenderAuthenticatedAppPageOptions = {
  params: LocalizedParams;
  signInPath: (locale: Locale) => string;
  render: (
    context: AuthenticatedAppRouteContext,
  ) => ReactNode | Promise<ReactNode>;
};

export async function generateAuthenticatedAppPageMetadata({
  params,
  canonicalPath,
  resolveMetadata,
}: GenerateAuthenticatedAppPageMetadataOptions): Promise<Metadata> {
  const { locale } = await params;
  const resolvedLocale: Locale = isSupportedLocale(locale) ? locale : defaultLocale;
  const dictionary = getDictionary(resolvedLocale);
  const pageMetadata = resolveMetadata(dictionary);
  const routePath = canonicalPath(resolvedLocale);

  return {
    title: `QuietShift | ${pageMetadata.title}`,
    description: pageMetadata.description,
    robots: {
      index: false,
      follow: false,
    },
    alternates: {
      canonical: routePath,
    },
    openGraph: {
      title: `QuietShift | ${pageMetadata.title}`,
      description: pageMetadata.description,
      url: `${siteUrl}${routePath}`,
      siteName: "QuietShift",
      locale: resolvedLocale === "ru" ? "ru_RU" : "en_US",
      type: "website",
    },
  };
}

export async function renderAuthenticatedAppPage({
  params,
  signInPath,
  render,
}: RenderAuthenticatedAppPageOptions) {
  const { locale } = await params;
  const resolvedLocale: Locale = isSupportedLocale(locale) ? locale : defaultLocale;
  const dictionary = getDictionary(resolvedLocale);
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(signInPath(resolvedLocale));
  }

  return render({
    locale: resolvedLocale,
    dictionary,
    user,
  });
}
