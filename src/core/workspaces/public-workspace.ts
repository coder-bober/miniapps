import { getInternalApiUrl } from "@/lib/api/internal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicWorkspaceLookupResponseSchema } from "@/shared/api/workspaces.mjs";

type SearchParamsInput =
  | Record<string, string | string[] | undefined>
  | URLSearchParams
  | null
  | undefined;

export type PublicWorkspaceSelection = {
  requestedWorkspaceId: string | null;
  workspace:
    | {
        id: string;
        slug: string;
        name: string;
        kind: "personal" | "shared";
      }
    | null;
  fallbackNotice: string | null;
};

export async function resolvePublicWorkspaceSelection({
  searchParams,
  fallbackNotice,
  userId = null,
}: {
  searchParams: SearchParamsInput;
  fallbackNotice: string;
  userId?: string | null;
}): Promise<PublicWorkspaceSelection> {
  const requestedWorkspaceId = readWorkspaceId(searchParams);

  if (!requestedWorkspaceId) {
    return {
      requestedWorkspaceId: null,
      workspace: null,
      fallbackNotice: null,
    };
  }

  if (userId) {
    const workspace = await resolveAuthenticatedWorkspace({
      userId,
      workspaceId: requestedWorkspaceId,
    });

    if (workspace) {
      return {
        requestedWorkspaceId,
        workspace,
        fallbackNotice: null,
      };
    }
  }

  try {
    const response = await fetch(
      `${getInternalApiUrl()}/v1/workspaces/public/${encodeURIComponent(requestedWorkspaceId)}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return {
        requestedWorkspaceId,
        workspace: null,
        fallbackNotice,
      };
    }

    const payload = await response.json().catch(() => null);
    const parsed = publicWorkspaceLookupResponseSchema.safeParse(payload);

    if (!parsed.success) {
      return {
        requestedWorkspaceId,
        workspace: null,
        fallbackNotice,
      };
    }

    return {
      requestedWorkspaceId,
      workspace: parsed.data.workspace,
      fallbackNotice: null,
    };
  } catch {
    return {
      requestedWorkspaceId,
      workspace: null,
      fallbackNotice,
    };
  }
}

async function resolveAuthenticatedWorkspace({
  userId,
  workspaceId,
}: {
  userId: string;
  workspaceId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select("id, slug, name, kind, workspace_memberships!inner(role)")
    .eq("id", workspaceId)
    .eq("workspace_memberships.user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  if (
    typeof data.id !== "string" ||
    typeof data.slug !== "string" ||
    typeof data.name !== "string" ||
    (data.kind !== "personal" && data.kind !== "shared")
  ) {
    return null;
  }

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    kind: data.kind,
  };
}

function readWorkspaceId(searchParams: SearchParamsInput) {
  if (!searchParams) {
    return null;
  }

  if (searchParams instanceof URLSearchParams) {
    return normalizeValue(searchParams.get("bbb"));
  }

  const rawValue = searchParams.bbb;

  if (Array.isArray(rawValue)) {
    return normalizeValue(rawValue[0] ?? null);
  }

  return normalizeValue(rawValue ?? null);
}

function normalizeValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
