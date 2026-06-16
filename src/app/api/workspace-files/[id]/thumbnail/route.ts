import { getCurrentUserWorkspaceModuleAccess } from "@/core/authz/module-access";
import { getCurrentUserDefaultWorkspaceContext } from "@/core/workspaces/default-workspace";
import { getInternalApiUrl } from "@/lib/api/internal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isModuleEnabled } from "@/shared/modules/enabled-modules";
import { createWorkspaceFileThumbnailRouteHandlers } from "./route-handlers.mjs";

const handlers = createWorkspaceFileThumbnailRouteHandlers({
  isModuleEnabled,
  createSupabaseServerClient,
  getCurrentUserWorkspaceModuleAccess,
  getCurrentUserDefaultWorkspaceContext,
  getInternalApiUrl,
  fetchImplementation: fetch,
});

export const GET = handlers.GET;
