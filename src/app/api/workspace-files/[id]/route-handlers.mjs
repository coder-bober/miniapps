import {
  workspaceFileDeleteResponseSchema,
  workspaceFileErrorResponseSchema,
} from "../../../../shared/api/workspace-files.mjs";
import {
  createAuthorizedUserContext,
  createInvalidSessionResponse,
  createModuleDisabledResponse,
  forwardJsonResponse,
  jsonResponse,
} from "../../../../core/api/next-proxy-helpers.mjs";

export function createWorkspaceFileItemRouteHandlers({
  isModuleEnabled,
  createSupabaseServerClient,
  getCurrentUserWorkspaceModuleAccess,
  getCurrentUserDefaultWorkspaceContext,
  getInternalApiUrl,
  fetchImplementation = globalThis.fetch,
}) {
  async function DELETE(request, context) {
    if (!isModuleEnabled("workspace-files")) {
      return createModuleDisabledResponse({
        error: "workspace_file_not_found",
        message: "The workspace files module is disabled.",
      });
    }

    const authorizedUser = await createAuthorizedUserContext(createSupabaseServerClient);

    if (!authorizedUser) {
      return createInvalidSessionResponse();
    }

    const { id } = await context.params;
    const requestUrl = new URL(request.url);
    const workspaceSlug = requestUrl.searchParams.get("workspaceSlug") ?? "default";
    const workspaceId = requestUrl.searchParams.get("workspaceId");
    const workspaceContext = await getCurrentUserDefaultWorkspaceContext(
      authorizedUser.userId,
      workspaceId,
      workspaceSlug,
    );
    const workspaceAccess = await getCurrentUserWorkspaceModuleAccess(
      authorizedUser.userId,
      workspaceContext.workspaceId,
      "workspace-files",
    );

    if (!workspaceAccess.capabilities.includes("workspace-files.delete")) {
      return jsonResponse(
        {
          error: "module_capability_required",
          message: "The current user lacks the required module capability.",
          requiredCapability: "workspace-files.delete",
        },
        { status: 403 },
      );
    }

    const upstream = await fetchImplementation(`${getInternalApiUrl()}/v1/workspace/files/${id}`, {
      method: "DELETE",
      headers: {
        authorization: authorizedUser.authorization,
      },
      cache: "no-store",
    });
    const { ok, status, payload } = await forwardJsonResponse(upstream);

    if (!ok) {
      const parsedError = workspaceFileErrorResponseSchema.safeParse(payload);

      return jsonResponse(
        parsedError.success
          ? parsedError.data
          : {
              error: "workspace_file_delete_failed",
              message: "The workspace file deletion failed.",
            },
        { status },
      );
    }

    const parsedResponse = workspaceFileDeleteResponseSchema.safeParse(payload);

    if (!parsedResponse.success) {
      return jsonResponse(
        {
          error: "workspace_file_delete_failed",
          message: "The workspace file deletion response was invalid.",
        },
        { status: 502 },
      );
    }

    return jsonResponse(parsedResponse.data);
  }

  return {
    DELETE,
  };
}
