import type { NextRequest } from "next/server";

import { defaultLocale, isSupportedLocale } from "@/lib/i18n/config";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];
  const requestHeaders = new Headers(request.headers);

  if (maybeLocale && isSupportedLocale(maybeLocale)) {
    requestHeaders.set("x-current-locale", maybeLocale);
  } else {
    requestHeaders.set("x-current-locale", defaultLocale);
  }

  requestHeaders.set("x-current-pathname", pathname);

  return updateSupabaseSession(request, requestHeaders);
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
