import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { assertSupabaseEnv, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";

export async function createSupabaseServerClient() {
  assertSupabaseEnv();

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component renders cannot mutate cookies; middleware and route handlers own refresh writes.
        }
      },
    },
  });
}
