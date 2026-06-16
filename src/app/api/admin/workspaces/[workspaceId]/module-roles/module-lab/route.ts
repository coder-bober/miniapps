import { getInternalApiUrl } from "@/lib/api/internal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAdminWorkspaceModuleLabRolesRouteHandlers } from "./route-handlers.mjs";

const handlers = createAdminWorkspaceModuleLabRolesRouteHandlers({
  createSupabaseServerClient,
  getInternalApiUrl,
  fetchImplementation: fetch,
});

export const GET = handlers.GET;
