"use server";

import { redirect } from "next/navigation";

import {
  getDeleteAccountErrorMessage,
  getSessionSignOutEverywhereErrorMessage,
} from "@/lib/api/errors";
import { deleteOwnAccountViaApi, signOutEverywhereViaApi } from "@/lib/api/internal";
import { defaultLocale, isSupportedLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function resolveLocale(value: FormDataEntryValue | null) {
  return typeof value === "string" && isSupportedLocale(value) ? value : defaultLocale;
}

function resolveString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function changePasswordAction(formData: FormData) {
  const locale = resolveLocale(formData.get("locale"));
  const dictionary = getDictionary(locale);
  const password = resolveString(formData.get("password"));
  const confirmPassword = resolveString(formData.get("confirm_password"));

  if (password.length < 8) {
    redirect(
      `/${locale}/settings?passwordError=${encodeURIComponent(dictionary.auth.messages.passwordChangeTooShort)}`,
    );
  }

  if (password !== confirmPassword) {
    redirect(
      `/${locale}/settings?passwordError=${encodeURIComponent(dictionary.auth.messages.passwordChangeMismatch)}`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    redirect(
      `/${locale}/settings?passwordError=${encodeURIComponent(dictionary.auth.messages.passwordChangeFailed)}`,
    );
  }

  redirect(
    `/${locale}/settings?passwordMessage=${encodeURIComponent(dictionary.auth.messages.passwordChangeComplete)}`,
  );
}

export async function deleteAccountAction(formData: FormData) {
  const locale = resolveLocale(formData.get("locale"));
  const dictionary = getDictionary(locale);
  const confirmation = resolveString(formData.get("confirmation"));

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!user || !session?.access_token) {
    redirect(`/${locale}/sign-in`);
  }

  const expectedEmail = user.email?.trim().toLowerCase() ?? "";

  if (!expectedEmail || confirmation.toLowerCase() !== expectedEmail) {
    redirect(
      `/${locale}/settings?deleteError=${encodeURIComponent(dictionary.auth.messages.accountDeletionMismatch)}`,
    );
  }

  try {
    const result = await deleteOwnAccountViaApi({
      accessToken: session.access_token,
      confirmation,
    });

    if (!result.ok) {
      redirect(
        `/${locale}/settings?deleteError=${encodeURIComponent(
          getDeleteAccountErrorMessage(result.error, dictionary),
        )}`,
      );
    }
  } catch {
    redirect(
      `/${locale}/settings?deleteError=${encodeURIComponent(dictionary.auth.messages.accountDeletionUnavailable)}`,
    );
  }

  try {
    await supabase.auth.signOut({ scope: "global" });
  } catch {
    // The user has already been deleted; cookie cleanup is best-effort here.
  }

  redirect(
    `/${locale}/sign-in?message=${encodeURIComponent(dictionary.auth.messages.accountDeletionComplete)}`,
  );
}

export async function signOutEverywhereAction(formData: FormData) {
  const locale = resolveLocale(formData.get("locale"));
  const dictionary = getDictionary(locale);
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    redirect(`/${locale}/sign-in`);
  }

  try {
    const result = await signOutEverywhereViaApi({
      accessToken: session.access_token,
    });

    if (!result.ok) {
      redirect(
        `/${locale}/settings?sessionError=${encodeURIComponent(
          getSessionSignOutEverywhereErrorMessage(result.error, dictionary),
        )}`,
      );
    }
  } catch {
    redirect(
      `/${locale}/settings?sessionError=${encodeURIComponent(dictionary.auth.messages.sessionSignOutEverywhereFailed)}`,
    );
  }

  try {
    await supabase.auth.signOut({ scope: "global" });
  } catch (error) {
    console.error("[settings-actions] signOutEverywhereAction local sign-out failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    redirect(
      `/${locale}/settings?sessionError=${encodeURIComponent(dictionary.auth.messages.sessionSignOutEverywhereFailed)}`,
    );
  }

  redirect(
    `/${locale}/sign-in?message=${encodeURIComponent(dictionary.auth.messages.sessionSignOutEverywhereComplete)}`,
  );
}
