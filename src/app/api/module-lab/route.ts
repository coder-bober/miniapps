import { getCurrentUserModuleAccess, getCurrentUserWorkspaceModuleAccess } from "@/core/authz/module-access";
import { getInternalApiUrl } from "@/lib/api/internal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isModuleEnabled } from "@/shared/modules/enabled-modules";
import { createModuleLabRouteHandlers } from "./route-handlers.mjs";

const handlers = createModuleLabRouteHandlers({
  isModuleEnabled,
  createSupabaseServerClient,
  getCurrentUserModuleAccess,
  getCurrentUserWorkspaceModuleAccess,
  getInternalApiUrl,
  fetchImplementation: fetch,
});

export const GET = handlers.GET;
export const POST = handlers.POST;
