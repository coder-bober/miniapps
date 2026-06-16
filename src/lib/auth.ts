import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthenticatedUser } from "@/types/auth";

export const getAuthenticatedUser = cache(async (): Promise<AuthenticatedUser | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const username = profile?.username ?? null;
  const fullName = profile?.full_name ?? null;
  const avatarUrl = profile?.avatar_url ?? null;

  return {
    id: user.id,
    email: user.email ?? null,
    username,
    fullName,
    avatarUrl,
    displayName: fullName || username || user.email || "User",
  };
});

export async function isAuthenticated() {
  const user = await getAuthenticatedUser();
  return Boolean(user);
}
