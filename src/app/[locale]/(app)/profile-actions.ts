"use server";

import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/auth";
import { defaultLocale, isSupportedLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function resolveLocale(value: FormDataEntryValue | null) {
  return typeof value === "string" && isSupportedLocale(value) ? value : defaultLocale;
}

function resolveOptionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function resolveUsername(value: FormDataEntryValue | null) {
  const username = resolveOptionalString(value);
  return username ? username.toLowerCase() : null;
}

export async function updateProfileAction(formData: FormData) {
  const locale = resolveLocale(formData.get("locale"));
  const dictionary = getDictionary(locale);
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/${locale}/sign-in`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: resolveOptionalString(formData.get("full_name")),
      username: resolveUsername(formData.get("username")),
      avatar_url: resolveOptionalString(formData.get("avatar_url")),
    })
    .eq("id", user.id);

  if (error) {
    redirect(`/${locale}/profile?error=${encodeURIComponent(error.message)}`);
  }

  redirect(
    `/${locale}/profile?message=${encodeURIComponent(dictionary.auth.messages.profileSaved)}`,
  );
}
