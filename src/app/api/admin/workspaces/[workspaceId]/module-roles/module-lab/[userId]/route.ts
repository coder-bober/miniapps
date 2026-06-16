import { getInternalApiUrl } from "@/lib/api/internal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAdminWorkspaceModuleLabRoleItemRouteHandlers } from "./route-handlers.mjs";

const handlers = createAdminWorkspaceModuleLabRoleItemRouteHandlers({
  createSupabaseServerClient,
  getInternalApiUrl,
  fetchImplementation: fetch,
});

export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
