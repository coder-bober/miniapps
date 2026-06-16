import { getInternalApiUrl } from "@/lib/api/internal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createWorkspacesRouteHandlers } from "./route-handlers.mjs";

const handlers = createWorkspacesRouteHandlers({
  createSupabaseServerClient,
  getInternalApiUrl,
  fetchImplementation: fetch,
});

export const GET = handlers.GET;
export const POST = handlers.POST;
