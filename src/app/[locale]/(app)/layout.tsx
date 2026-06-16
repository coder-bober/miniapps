import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { isAuthenticated } from "@/lib/auth";
import { defaultLocale, isSupportedLocale } from "@/lib/i18n/config";

type AppLayoutProps = {
  children: ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export default async function AppLayout({ children, params }: AppLayoutProps) {
  const { locale } = await params;
  const authenticated = await isAuthenticated();
  const resolvedLocale = isSupportedLocale(locale) ? locale : defaultLocale;
  const pathname = (await headers()).get("x-current-pathname") ?? "";
  const isPublicModuleLabPath = pathname === `/${resolvedLocale}/module-lab`;

  if (!authenticated && !isPublicModuleLabPath) {
    redirect(`/${resolvedLocale}/sign-in`);
  }

  return children;
}
