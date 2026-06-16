import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { getAuthenticatedUser } from "@/lib/auth";
import {
  defaultLocale,
  isSupportedLocale,
  locales,
  siteUrl,
  type Locale,
} from "@/lib/i18n/config";
import { getDictionary, type SiteDictionary } from "@/lib/i18n/dictionaries";
import { getPublicModulePageMetadata } from "@/modules/registry";
import { isModuleEnabled } from "@/shared/modules/enabled-modules";
import type { AuthenticatedUser } from "@/types/auth";

type LocalizedParams = Promise<{
  locale: string;
}>;

type LocalizedSearchParams = Promise<Record<string, string | string[] | undefined>>;

export type PublicModuleRouteContext = {
  locale: Locale;
  dictionary: SiteDictionary;
  user: AuthenticatedUser | null;
  searchParams: Record<string, string | string[] | undefined>;
};

type GeneratePublicModulePageMetadataOptions = {
  params: LocalizedParams;
  moduleId: string;
  canonicalPath: (locale: Locale) => string;
};

type RenderPublicModulePageOptions = {
  params: LocalizedParams;
  searchParams?: LocalizedSearchParams;
  moduleId: string;
  render: (context: PublicModuleRouteContext) => ReactNode | Promise<ReactNode>;
};

export async function generatePublicModulePageMetadata({
  params,
  moduleId,
  canonicalPath,
}: GeneratePublicModulePageMetadataOptions): Promise<Metadata> {
  if (!isModuleEnabled(moduleId)) {
    return {};
  }

  const { locale } = await params;
  const resolvedLocale: Locale = isSupportedLocale(locale) ? locale : defaultLocale;
  const dictionary = getDictionary(resolvedLocale);
  const pageMetadata = getPublicModulePageMetadata(moduleId, dictionary);

  if (!pageMetadata) {
    return {};
  }

  const routePath = canonicalPath(resolvedLocale);
  const languages = Object.fromEntries(
    locales.map((item) => [item, canonicalPath(item)]),
  );

  return {
    title: `QuietShift | ${pageMetadata.title}`,
    description: pageMetadata.description,
    alternates: {
      canonical: routePath,
      languages,
    },
    openGraph: {
      title: `QuietShift | ${pageMetadata.title}`,
      description: pageMetadata.description,
      url: `${siteUrl}${routePath}`,
      siteName: "QuietShift",
      locale: resolvedLocale === "ru" ? "ru_RU" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `QuietShift | ${pageMetadata.title}`,
      description: pageMetadata.description,
    },
  };
}

export async function renderPublicModulePage({
  params,
  searchParams,
  moduleId,
  render,
}: RenderPublicModulePageOptions) {
  if (!isModuleEnabled(moduleId)) {
    notFound();
  }

  const { locale } = await params;
  const resolvedLocale: Locale = isSupportedLocale(locale) ? locale : defaultLocale;
  const dictionary = getDictionary(resolvedLocale);
  const user = await getAuthenticatedUser();
  const resolvedSearchParams = searchParams ? await searchParams : {};

  return render({
    locale: resolvedLocale,
    dictionary,
    user,
    searchParams: resolvedSearchParams,
  });
}
