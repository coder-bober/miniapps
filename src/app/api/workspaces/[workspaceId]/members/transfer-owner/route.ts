import { getInternalApiUrl } from "@/lib/api/internal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createWorkspaceTransferOwnerRouteHandlers } from "./route-handlers.mjs";

const handlers = createWorkspaceTransferOwnerRouteHandlers({
  createSupabaseServerClient,
  getInternalApiUrl,
  fetchImplementation: fetch,
});

export const POST = handlers.POST;
