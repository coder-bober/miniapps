import { workspaceFileErrorResponseSchema } from "../../../../../shared/api/workspace-files.mjs";
import {
  createAuthorizedUserContext,
  createBinaryResponse,
  createInvalidSessionResponse,
  createModuleDisabledResponse,
  jsonResponse,
} from "../../../../../core/api/next-proxy-helpers.mjs";

export function createWorkspaceFileThumbnailRouteHandlers({
  isModuleEnabled,
  createSupabaseServerClient,
  getCurrentUserWorkspaceModuleAccess,
  getCurrentUserDefaultWorkspaceContext,
  getInternalApiUrl,
  fetchImplementation = globalThis.fetch,
}) {
  async function GET(request, context) {
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

    if (!workspaceAccess.capabilities.includes("workspace-files.read")) {
      return jsonResponse(
        {
          error: "module_capability_required",
          message: "The current user lacks the required module capability.",
          requiredCapability: "workspace-files.read",
        },
        { status: 403 },
      );
    }

    const upstream = await fetchImplementation(
      `${getInternalApiUrl()}/v1/workspace/files/${id}/thumbnail`,
      {
        method: "GET",
        headers: {
          authorization: authorizedUser.authorization,
        },
        cache: "no-store",
      },
    );

    if (!upstream.ok) {
      const payload = await upstream.json().catch(() => null);
      const parsedError = workspaceFileErrorResponseSchema.safeParse(payload);

      return jsonResponse(
        parsedError.success
          ? parsedError.data
          : {
              error: "workspace_thumbnail_failed",
              message: "The workspace thumbnail request failed.",
            },
        { status: upstream.status },
      );
    }

    const contentType = upstream.headers.get("content-type") ?? "image/webp";
    const body = await upstream.arrayBuffer();

    return createBinaryResponse(body, {
      contentType,
      cacheControl: "no-store",
    });
  }

  return {
    GET,
  };
}
