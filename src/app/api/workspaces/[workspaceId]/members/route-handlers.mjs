import {
  addWorkspaceMemberRequestSchema,
  addWorkspaceMemberResponseSchema,
  workspaceErrorResponseSchema,
  workspaceMemberListResponseSchema,
} from "../../../../../shared/api/workspaces.mjs";
import {
  createAuthorizedUserContext,
  createInvalidSessionResponse,
  forwardJsonResponse,
  jsonResponse,
} from "../../../../../core/api/next-proxy-helpers.mjs";

export function createWorkspaceMembersRouteHandlers({
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
      `${getInternalApiUrl()}/v1/workspaces/${encodeURIComponent(workspaceId)}/members`,
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
              error: "workspace_member_list_failed",
              message: "The workspace members request failed.",
            },
        { status },
      );
    }

    const parsedResponse = workspaceMemberListResponseSchema.safeParse(payload);

    if (!parsedResponse.success) {
      return jsonResponse(
        {
          error: "workspace_member_list_failed",
          message: "The workspace members response was invalid.",
        },
        { status: 502 },
      );
    }

    return jsonResponse(parsedResponse.data);
  }

  async function POST(request, context) {
    const authorizedUser = await createAuthorizedUserContext(createSupabaseServerClient);

    if (!authorizedUser) {
      return createInvalidSessionResponse();
    }

    const requestPayload = addWorkspaceMemberRequestSchema.parse(await request.json().catch(() => ({})));
    const { workspaceId } = await context.params;
    const upstream = await fetchImplementation(
      `${getInternalApiUrl()}/v1/workspaces/${encodeURIComponent(workspaceId)}/members`,
      {
        method: "POST",
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
              error: "workspace_member_add_failed",
              message: "The workspace member create request failed.",
            },
        { status },
      );
    }

    const parsedResponse = addWorkspaceMemberResponseSchema.safeParse(payload);

    if (!parsedResponse.success) {
      return jsonResponse(
        {
          error: "workspace_member_add_failed",
          message: "The workspace member create response was invalid.",
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
