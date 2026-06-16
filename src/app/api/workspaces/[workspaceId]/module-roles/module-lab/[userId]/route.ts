import { getInternalApiUrl } from "@/lib/api/internal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createWorkspaceModuleLabRoleItemRouteHandlers } from "./route-handlers.mjs";

const handlers = createWorkspaceModuleLabRoleItemRouteHandlers({
  createSupabaseServerClient,
  getInternalApiUrl,
  fetchImplementation: fetch,
});

export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
