import { getInternalApiUrl } from "@/lib/api/internal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAdminWorkspaceMembersRouteHandlers } from "./route-handlers.mjs";

const handlers = createAdminWorkspaceMembersRouteHandlers({
  createSupabaseServerClient,
  getInternalApiUrl,
  fetchImplementation: fetch,
});

export const GET = handlers.GET;
