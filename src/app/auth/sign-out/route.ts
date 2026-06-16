import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSignOutRedirectUrl } from "@/shared/auth/sign-out-redirect.mjs";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "local" });

  return NextResponse.redirect(
    createSignOutRedirectUrl({
      requestUrl: request.url,
      referer: request.headers.get("referer"),
    }),
  );
}
