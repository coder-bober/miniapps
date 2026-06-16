import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { defaultLocale, isSupportedLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function resolveLocaleFromPath(nextPath: string) {
  const firstSegment = nextPath.split("/").filter(Boolean)[0];
  return firstSegment && isSupportedLocale(firstSegment) ? firstSegment : defaultLocale;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = requestUrl.searchParams.get("next") ?? "/";
  const locale = resolveLocaleFromPath(next);
  const dictionary = getDictionary(locale);
  const isRecovery = next.includes("/reset-password");
  const failurePath = isRecovery
    ? `/${locale}/forgot-password?error=${encodeURIComponent(dictionary.auth.messages.passwordResetInvalid)}`
    : `/${locale}/sign-in?error=${encodeURIComponent(dictionary.auth.messages.confirmationExpired)}`;

  if (!code && !(tokenHash && type)) {
    return NextResponse.redirect(new URL(failurePath, request.url));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({
        token_hash: tokenHash!,
        type: type as "recovery" | "signup",
      });

  if (error) {
    const errorPath = isRecovery
      ? `/${locale}/forgot-password?error=${encodeURIComponent(dictionary.auth.messages.passwordResetInvalid)}`
      : `/${locale}/sign-in?error=${encodeURIComponent(dictionary.auth.messages.confirmationFailed)}`;

    return NextResponse.redirect(
      new URL(errorPath, request.url),
    );
  }

  return NextResponse.redirect(new URL(next, request.url));
}
