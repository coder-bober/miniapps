import {
  adminWorkspaceListResponseSchema,
  workspaceErrorResponseSchema,
} from "../../../../shared/api/workspaces.mjs";
import {
  createAuthorizedUserContext,
  createInvalidSessionResponse,
  forwardJsonResponse,
  jsonResponse,
} from "../../../../core/api/next-proxy-helpers.mjs";

export function createAdminWorkspacesRouteHandlers({
  createSupabaseServerClient,
  getInternalApiUrl,
  fetchImplementation = globalThis.fetch,
}) {
  async function GET(request) {
    const authorizedUser = await createAuthorizedUserContext(createSupabaseServerClient);

    if (!authorizedUser) {
      return createInvalidSessionResponse();
    }

    const requestUrl = new URL(request.url);
    const upstreamUrl = new URL(`${getInternalApiUrl()}/v1/admin/workspaces`);
    const limit = requestUrl.searchParams.get("limit");

    if (limit !== null) {
      upstreamUrl.searchParams.set("limit", limit);
    }

    const upstream = await fetchImplementation(upstreamUrl.toString(), {
      method: "GET",
      headers: {
        authorization: authorizedUser.authorization,
      },
      cache: "no-store",
    });
    const { ok, status, payload } = await forwardJsonResponse(upstream);

    if (!ok) {
      const parsedError = workspaceErrorResponseSchema.safeParse(payload);

      return jsonResponse(
        parsedError.success
          ? parsedError.data
          : {
              error: "admin_workspace_list_failed",
              message: "The admin workspace list request failed.",
            },
        { status },
      );
    }

    const parsedResponse = adminWorkspaceListResponseSchema.safeParse(payload);

    if (!parsedResponse.success) {
      return jsonResponse(
        {
          error: "admin_workspace_list_failed",
          message: "The admin workspace list response was invalid.",
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
