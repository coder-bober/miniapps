import { getInternalApiUrl } from "@/lib/api/internal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAdminWorkspaceMemberItemRouteHandlers } from "./route-handlers.mjs";

const handlers = createAdminWorkspaceMemberItemRouteHandlers({
  createSupabaseServerClient,
  getInternalApiUrl,
  fetchImplementation: fetch,
});

export const PATCH = handlers.PATCH;
