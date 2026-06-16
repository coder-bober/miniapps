"use server";

import { redirect } from "next/navigation";

import { defaultLocale, isSupportedLocale, siteUrl } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function resolveLocale(value: FormDataEntryValue | null) {
  return typeof value === "string" && isSupportedLocale(value) ? value : defaultLocale;
}

function resolveString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function getAuthErrorMessage(message: string, locale: ReturnType<typeof resolveLocale>) {
  const dictionary = getDictionary(locale);
  const normalized = message.toLowerCase();

  if (normalized.includes("email not confirmed")) {
    return dictionary.auth.messages.signInRequiresConfirmation;
  }

  return message;
}

export async function signInAction(formData: FormData) {
  const locale = resolveLocale(formData.get("locale"));
  const email = resolveString(formData.get("email"));
  const password = resolveString(formData.get("password"));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(
      `/${locale}/sign-in?error=${encodeURIComponent(getAuthErrorMessage(error.message, locale))}`,
    );
  }

  redirect(`/${locale}/workspace`);
}

export async function signUpAction(formData: FormData) {
  const locale = resolveLocale(formData.get("locale"));
  const dictionary = getDictionary(locale);
  const email = resolveString(formData.get("email"));
  const password = resolveString(formData.get("password"));

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=/${locale}/workspace`,
    },
  });

  if (error) {
    redirect(`/${locale}/sign-up?error=${encodeURIComponent(error.message)}`);
  }

  if (data.session) {
    redirect(`/${locale}/workspace`);
  }

  redirect(
    `/${locale}/check-email?email=${encodeURIComponent(email)}&message=${encodeURIComponent(
      dictionary.auth.messages.confirmEmail,
    )}`,
  );
}

export async function resendConfirmationAction(formData: FormData) {
  const locale = resolveLocale(formData.get("locale"));
  const dictionary = getDictionary(locale);
  const email = resolveString(formData.get("email"));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=/${locale}/workspace`,
    },
  });

  if (error) {
    redirect(
      `/${locale}/check-email?email=${encodeURIComponent(email)}&error=${encodeURIComponent(
        error.message,
      )}`,
    );
  }

  redirect(
    `/${locale}/check-email?email=${encodeURIComponent(email)}&message=${encodeURIComponent(
      dictionary.auth.messages.confirmationLinkResent,
    )}`,
  );
}

export async function requestPasswordResetAction(formData: FormData) {
  const locale = resolveLocale(formData.get("locale"));
  const dictionary = getDictionary(locale);
  const email = resolveString(formData.get("email"));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/${locale}/reset-password`,
  });

  if (error) {
    redirect(
      `/${locale}/forgot-password?email=${encodeURIComponent(email)}&error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect(
    `/${locale}/forgot-password?email=${encodeURIComponent(email)}&message=${encodeURIComponent(
      dictionary.auth.messages.passwordResetSent,
    )}`,
  );
}

export async function updatePasswordAction(formData: FormData) {
  const locale = resolveLocale(formData.get("locale"));
  const dictionary = getDictionary(locale);
  const password = resolveString(formData.get("password"));

  if (password.length < 8) {
    redirect(
      `/${locale}/reset-password?error=${encodeURIComponent(dictionary.auth.messages.passwordResetFailed)}`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    redirect(
      `/${locale}/reset-password?error=${encodeURIComponent(dictionary.auth.messages.passwordResetFailed)}`,
    );
  }

  redirect(
    `/${locale}/sign-in?message=${encodeURIComponent(dictionary.auth.messages.passwordResetComplete)}`,
  );
}
