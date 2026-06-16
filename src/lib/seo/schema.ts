import type { Locale } from "@/lib/i18n/config";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";

export function getMarketingSchemas(
  locale: Locale,
  siteUrl: string,
  dictionary: SiteDictionary,
) {
  const pageUrl = `${siteUrl}/${locale}`;

  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "QuietShift",
      url: siteUrl,
      logo: `${siteUrl}/next.svg`,
      sameAs: [],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "QuietShift",
      url: pageUrl,
      inLanguage: locale,
      description: dictionary.seo.description,
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "QuietShift",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: pageUrl,
      inLanguage: locale,
      description: dictionary.seo.description,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
  ];
}
