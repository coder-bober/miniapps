import { getInternalApiUrl } from "@/lib/api/internal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAdminWorkspacesRouteHandlers } from "./route-handlers.mjs";

const handlers = createAdminWorkspacesRouteHandlers({
  createSupabaseServerClient,
  getInternalApiUrl,
  fetchImplementation: fetch,
});

export const GET = handlers.GET;
