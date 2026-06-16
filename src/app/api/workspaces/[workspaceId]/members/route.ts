import { getInternalApiUrl } from "@/lib/api/internal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createWorkspaceMembersRouteHandlers } from "./route-handlers.mjs";

const handlers = createWorkspaceMembersRouteHandlers({
  createSupabaseServerClient,
  getInternalApiUrl,
  fetchImplementation: fetch,
});

export const GET = handlers.GET;
export const POST = handlers.POST;
