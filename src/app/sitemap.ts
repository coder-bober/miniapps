import type { MetadataRoute } from "next";

import { locales, siteUrl } from "@/lib/i18n/config";
import { getPublicModulePaths } from "@/modules/registry";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const paths = [
    "",
    ...getPublicModulePaths().map((module: { id: string; path: string }) => module.path),
  ];

  return paths.flatMap((path) =>
    locales.map((locale) => ({
      url: `${siteUrl}/${locale}${path}`,
      lastModified: now,
      changeFrequency: path === "" ? "weekly" : "monthly",
      priority: path === "" ? (locale === "en" ? 1 : 0.9) : 0.7,
      alternates: {
        languages: Object.fromEntries(
          locales.map((item) => [item, `${siteUrl}/${item}${path}`]),
        ),
      },
    })),
  );
}
