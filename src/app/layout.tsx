import type { Metadata } from "next";
import { ColorSchemeScript } from "@mantine/core";
import { headers } from "next/headers";

import { AppProvider } from "@/components/app-provider";
import { defaultLocale, isSupportedLocale, siteUrl } from "@/lib/i18n/config";

import "@mantine/core/styles.css";
import "@fontsource-variable/manrope";
import "@fontsource-variable/space-grotesk";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "QuietShift",
  description: "Operational intelligence for modern SaaS teams.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerStore = await headers();
  const localeHeader = headerStore.get("x-current-locale");
  const lang = localeHeader && isSupportedLocale(localeHeader) ? localeHeader : defaultLocale;

  return (
    <html
      lang={lang}
      suppressHydrationWarning
    >
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
