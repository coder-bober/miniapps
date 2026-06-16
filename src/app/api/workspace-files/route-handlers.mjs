import {
  workspaceFileErrorResponseSchema,
  workspaceFileListResponseSchema,
  workspaceFileUploadResponseSchema,
} from "../../../shared/api/workspace-files.mjs";
import {
  createAuthorizedUserContext,
  createInvalidSessionResponse,
  createModuleDisabledResponse,
  forwardJsonResponse,
  jsonResponse,
} from "../../../core/api/next-proxy-helpers.mjs";

export function createWorkspaceFilesRouteHandlers({
  isModuleEnabled,
  createSupabaseServerClient,
  getCurrentUserWorkspaceModuleAccess,
  getCurrentUserDefaultWorkspaceContext,
  getInternalApiUrl,
  fetchImplementation = globalThis.fetch,
}) {
  async function GET(request) {
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
      `${getInternalApiUrl()}/v1/workspace/files?workspaceSlug=${encodeURIComponent(workspaceContext.workspaceSlug)}${workspaceContext.workspaceId ? `&workspaceId=${encodeURIComponent(workspaceContext.workspaceId)}` : ""}`,
      {
        method: "GET",
        headers: {
          authorization: authorizedUser.authorization,
        },
        cache: "no-store",
      },
    );

    const { ok, status, payload } = await forwardJsonResponse(upstream);

    if (!ok) {
      const parsedError = workspaceFileErrorResponseSchema.safeParse(payload);

      return jsonResponse(
        parsedError.success
          ? parsedError.data
          : {
              error: "workspace_file_upload_failed",
              message: "The workspace file request failed.",
            },
        { status },
      );
    }

    const parsedResponse = workspaceFileListResponseSchema.safeParse(payload);

    if (!parsedResponse.success) {
      return jsonResponse(
        {
          error: "workspace_file_upload_failed",
          message: "The workspace file list response was invalid.",
        },
        { status: 502 },
      );
    }

    return jsonResponse(parsedResponse.data);
  }

  async function POST(request) {
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

    const formData = await request.formData();
    const workspaceSlug = String(formData.get("workspaceSlug") ?? "default");
    const workspaceIdValue = formData.get("workspaceId");
    const workspaceId =
      typeof workspaceIdValue === "string" && workspaceIdValue.trim().length > 0
        ? workspaceIdValue
        : null;
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

    if (!workspaceAccess.capabilities.includes("workspace-files.upload")) {
      return jsonResponse(
        {
          error: "module_capability_required",
          message: "The current user lacks the required module capability.",
          requiredCapability: "workspace-files.upload",
        },
        { status: 403 },
      );
    }

    if (workspaceContext.workspaceId && !formData.get("workspaceId")) {
      formData.set("workspaceId", workspaceContext.workspaceId);
    }

    const upstream = await fetchImplementation(`${getInternalApiUrl()}/v1/workspace/files`, {
      method: "POST",
      headers: {
        authorization: authorizedUser.authorization,
      },
      body: formData,
      cache: "no-store",
    });

    const { ok, status, payload } = await forwardJsonResponse(upstream);

    if (!ok) {
      const parsedError = workspaceFileErrorResponseSchema.safeParse(payload);

      return jsonResponse(
        parsedError.success
          ? parsedError.data
          : {
              error: "workspace_file_upload_failed",
              message: "The workspace file upload failed.",
            },
        { status },
      );
    }

    const parsedResponse = workspaceFileUploadResponseSchema.safeParse(payload);

    if (!parsedResponse.success) {
      return jsonResponse(
        {
          error: "workspace_file_upload_failed",
          message: "The workspace file upload response was invalid.",
        },
        { status: 502 },
      );
    }

    return jsonResponse(parsedResponse.data, { status: 201 });
  }

  return {
    GET,
    POST,
  };
}
