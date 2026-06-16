import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { WorkspaceContext } from "@/shared/workspaces/workspace-access";

function isMissingWorkspacesTable(error: { code?: string; message?: string } | null) {
  return error?.code === "42P01" || error?.message?.includes("workspaces");
}

export async function getCurrentUserDefaultWorkspaceContext(
  userId: string,
  workspaceId: string | null = null,
  workspaceSlug = "default",
): Promise<WorkspaceContext> {
  if (workspaceId) {
    return {
      workspaceId,
      workspaceSlug,
    };
  }

  if (workspaceSlug !== "default") {
    return {
      workspaceId: null,
      workspaceSlug,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select("id")
    .eq("kind", "personal")
    .eq("personal_owner_user_id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingWorkspacesTable(error)) {
      return {
        workspaceId: null,
        workspaceSlug,
      };
    }

    throw error;
  }

  return {
    workspaceId: data?.id ?? null,
    workspaceSlug,
  };
}
