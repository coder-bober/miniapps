import {
  updateWorkspaceMemberRoleRequestSchema,
  updateWorkspaceMemberRoleResponseSchema,
  workspaceErrorResponseSchema,
} from "../../../../../../../shared/api/workspaces.mjs";
import {
  createAuthorizedUserContext,
  createInvalidSessionResponse,
  forwardJsonResponse,
  jsonResponse,
} from "../../../../../../../core/api/next-proxy-helpers.mjs";

export function createAdminWorkspaceMemberItemRouteHandlers({
  createSupabaseServerClient,
  getInternalApiUrl,
  fetchImplementation = globalThis.fetch,
}) {
  async function PATCH(request, context) {
    const authorizedUser = await createAuthorizedUserContext(createSupabaseServerClient);

    if (!authorizedUser) {
      return createInvalidSessionResponse();
    }

    const requestPayload = updateWorkspaceMemberRoleRequestSchema.parse(
      await request.json().catch(() => ({})),
    );
    const { workspaceId, userId } = await context.params;
    const upstream = await fetchImplementation(
      `${getInternalApiUrl()}/v1/admin/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(userId)}`,
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
              error: "admin_workspace_member_update_failed",
              message: "The admin workspace member update request failed.",
            },
        { status },
      );
    }

    const parsedResponse = updateWorkspaceMemberRoleResponseSchema.safeParse(payload);

    if (!parsedResponse.success) {
      return jsonResponse(
        {
          error: "admin_workspace_member_update_failed",
          message: "The admin workspace member update response was invalid.",
        },
        { status: 502 },
      );
    }

    return jsonResponse(parsedResponse.data);
  }

  return {
    PATCH,
  };
}
