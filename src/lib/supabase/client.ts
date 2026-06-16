"use client";

import { createBrowserClient } from "@supabase/ssr";

import { assertSupabaseEnv, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";

export function createSupabaseBrowserClient() {
  assertSupabaseEnv();

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
