import {
  workspaceErrorResponseSchema,
  workspaceMemberListResponseSchema,
} from "../../../../../../shared/api/workspaces.mjs";
import {
  createAuthorizedUserContext,
  createInvalidSessionResponse,
  forwardJsonResponse,
  jsonResponse,
} from "../../../../../../core/api/next-proxy-helpers.mjs";

export function createAdminWorkspaceMembersRouteHandlers({
  createSupabaseServerClient,
  getInternalApiUrl,
  fetchImplementation = globalThis.fetch,
}) {
  async function GET(_request, context) {
    const authorizedUser = await createAuthorizedUserContext(createSupabaseServerClient);

    if (!authorizedUser) {
      return createInvalidSessionResponse();
    }

    const { workspaceId } = await context.params;
    const upstream = await fetchImplementation(
      `${getInternalApiUrl()}/v1/admin/workspaces/${encodeURIComponent(workspaceId)}/members`,
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
      const parsedError = workspaceErrorResponseSchema.safeParse(payload);

      return jsonResponse(
        parsedError.success
          ? parsedError.data
          : {
              error: "admin_workspace_member_list_failed",
              message: "The admin workspace members request failed.",
            },
        { status },
      );
    }

    const parsedResponse = workspaceMemberListResponseSchema.safeParse(payload);

    if (!parsedResponse.success) {
      return jsonResponse(
        {
          error: "admin_workspace_member_list_failed",
          message: "The admin workspace members response was invalid.",
        },
        { status: 502 },
      );
    }

    return jsonResponse(parsedResponse.data);
  }

  return {
    GET,
  };
}
