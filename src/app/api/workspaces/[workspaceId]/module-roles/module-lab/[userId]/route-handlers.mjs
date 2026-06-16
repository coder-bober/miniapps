import {
  removeWorkspaceModuleRoleResponseSchema,
  updateWorkspaceModuleRoleRequestSchema,
  updateWorkspaceModuleRoleResponseSchema,
  workspaceErrorResponseSchema,
} from "../../../../../../../../shared/api/workspaces.mjs";
import {
  createAuthorizedUserContext,
  createInvalidSessionResponse,
  forwardJsonResponse,
  jsonResponse,
} from "../../../../../../../../core/api/next-proxy-helpers.mjs";

export function createWorkspaceModuleLabRoleItemRouteHandlers({
  createSupabaseServerClient,
  getInternalApiUrl,
  fetchImplementation = globalThis.fetch,
}) {
  async function PATCH(request, context) {
    const authorizedUser = await createAuthorizedUserContext(createSupabaseServerClient);

    if (!authorizedUser) {
      return createInvalidSessionResponse();
    }

    const requestPayload = updateWorkspaceModuleRoleRequestSchema.parse(
      await request.json().catch(() => ({})),
    );
    const { workspaceId, userId } = await context.params;
    const upstream = await fetchImplementation(
      `${getInternalApiUrl()}/v1/workspaces/${encodeURIComponent(workspaceId)}/module-roles/module-lab/${encodeURIComponent(userId)}`,
      {
        method: "PATCH",
        headers: {
          authorization: authorizedUser.authorization,
          "content-type": "application/json",
        },
        body: JSON.stringify(requestPayload),
        cache: "no-store",
      },
    );
    const { ok, status, payload } = await forwardJsonResponse(upstream);

    if (!ok) {
      const parsedError = workspaceErrorResponseSchema.safeParse(payload);

      return jsonResponse(
        parsedError.success
          ? parsedError.data
          : {
              error: "workspace_module_role_update_failed",
              message: "The workspace module role update request failed.",
            },
        { status },
      );
    }

    const parsedResponse = updateWorkspaceModuleRoleResponseSchema.safeParse(payload);

    if (!parsedResponse.success) {
      return jsonResponse(
        {
          error: "workspace_module_role_update_failed",
          message: "The workspace module role update response was invalid.",
        },
        { status: 502 },
      );
    }

    return jsonResponse(parsedResponse.data);
  }

  async function DELETE(_request, context) {
    const authorizedUser = await createAuthorizedUserContext(createSupabaseServerClient);

    if (!authorizedUser) {
      return createInvalidSessionResponse();
    }

    const { workspaceId, userId } = await context.params;
    const upstream = await fetchImplementation(
      `${getInternalApiUrl()}/v1/workspaces/${encodeURIComponent(workspaceId)}/module-roles/module-lab/${encodeURIComponent(userId)}`,
      {
        method: "DELETE",
        headers: {
          authorization: authorizedUser.authorization,
        },
        cache: "no-store",
      },
    );
    const { ok, status, payload } = await forwardJsonResponse(upstream);

    if (!ok) {
      const parsedError = workspaceErrorResponseSchema.safeParse(payload);

      return jsonResponse(
        parsedError.success
          ? parsedError.data
          : {
              error: "workspace_module_role_remove_failed",
              message: "The workspace module role removal request failed.",
            },
        { status },
      );
    }

    const parsedResponse = removeWorkspaceModuleRoleResponseSchema.safeParse(payload);

    if (!parsedResponse.success) {
      return jsonResponse(
        {
          error: "workspace_module_role_remove_failed",
          message: "The workspace module role removal response was invalid.",
        },
        { status: 502 },
      );
    }

    return jsonResponse(parsedResponse.data);
  }

  return {
    PATCH,
    DELETE,
  };
}
