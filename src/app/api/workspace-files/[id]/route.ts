import { getCurrentUserWorkspaceModuleAccess } from "@/core/authz/module-access";
import { getCurrentUserDefaultWorkspaceContext } from "@/core/workspaces/default-workspace";
import { getInternalApiUrl } from "@/lib/api/internal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isModuleEnabled } from "@/shared/modules/enabled-modules";
import { createWorkspaceFileItemRouteHandlers } from "./route-handlers.mjs";

const handlers = createWorkspaceFileItemRouteHandlers({
  isModuleEnabled,
  createSupabaseServerClient,
  getCurrentUserWorkspaceModuleAccess,
  getCurrentUserDefaultWorkspaceContext,
  getInternalApiUrl,
  fetchImplementation: fetch,
});

export const DELETE = handlers.DELETE;
