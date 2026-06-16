import type { Locale } from "@/lib/i18n/config";

export function getLocalePath(locale: Locale, pathname: string) {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const segments = normalizedPath.split("/");

  if (segments.length > 1) {
    segments[1] = locale;
  }

  return segments.join("/") || `/${locale}`;
}
