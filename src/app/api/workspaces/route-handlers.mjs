import {
  createWorkspaceRequestSchema,
  createWorkspaceResponseSchema,
  workspaceErrorResponseSchema,
  workspaceListResponseSchema,
} from "../../../shared/api/workspaces.mjs";
import {
  createAuthorizedUserContext,
  createInvalidSessionResponse,
  forwardJsonResponse,
  jsonResponse,
} from "../../../core/api/next-proxy-helpers.mjs";

export function createWorkspacesRouteHandlers({
  createSupabaseServerClient,
  getInternalApiUrl,
  fetchImplementation = globalThis.fetch,
}) {
  async function GET() {
    const authorizedUser = await createAuthorizedUserContext(createSupabaseServerClient);

    if (!authorizedUser) {
      return createInvalidSessionResponse();
    }

    const upstream = await fetchImplementation(`${getInternalApiUrl()}/v1/workspaces`, {
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
              error: "workspace_list_failed",
              message: "The workspace list request failed.",
            },
        { status },
      );
    }

    const parsedResponse = workspaceListResponseSchema.safeParse(payload);

    if (!parsedResponse.success) {
      return jsonResponse(
        {
          error: "workspace_list_failed",
          message: "The workspace list response was invalid.",
        },
        { status: 502 },
      );
    }

    return jsonResponse(parsedResponse.data);
  }

  async function POST(request) {
    const authorizedUser = await createAuthorizedUserContext(createSupabaseServerClient);

    if (!authorizedUser) {
      return createInvalidSessionResponse();
    }

    const requestPayload = createWorkspaceRequestSchema.parse(await request.json().catch(() => ({})));
    const upstream = await fetchImplementation(`${getInternalApiUrl()}/v1/workspaces`, {
      method: "POST",
      headers: {
        authorization: authorizedUser.authorization,
        "content-type": "application/json",
      },
      body: JSON.stringify(requestPayload),
      cache: "no-store",
    });
    const { ok, status, payload } = await forwardJsonResponse(upstream);

    if (!ok) {
      const parsedError = workspaceErrorResponseSchema.safeParse(payload);

      return jsonResponse(
        parsedError.success
          ? parsedError.data
          : {
              error: "workspace_create_failed",
              message: "The workspace create request failed.",
            },
        { status },
      );
    }

    const parsedResponse = createWorkspaceResponseSchema.safeParse(payload);

    if (!parsedResponse.success) {
      return jsonResponse(
        {
          error: "workspace_create_failed",
          message: "The workspace create response was invalid.",
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
