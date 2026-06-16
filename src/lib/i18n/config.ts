export const locales = ["en", "ru"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  ru: "Русский",
};

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://quietshift.example";

export function isSupportedLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}
