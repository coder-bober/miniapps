import type { Metadata } from "next";
import { ColorSchemeScript } from "@mantine/core";
import { headers } from "next/headers";
import { Manrope, Space_Grotesk } from "next/font/google";

import { AppProvider } from "@/components/app-provider";
import { defaultLocale, isSupportedLocale, siteUrl } from "@/lib/i18n/config";

import "@mantine/core/styles.css";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

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
      className={`${manrope.variable} ${spaceGrotesk.variable}`}
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
