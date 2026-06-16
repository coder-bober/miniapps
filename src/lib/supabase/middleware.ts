import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { assertSupabaseEnv, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";

export async function updateSupabaseSession(
  request: NextRequest,
  requestHeaders?: Headers,
) {
  assertSupabaseEnv();

  const response = NextResponse.next({
    request: {
      headers: requestHeaders ?? request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}
