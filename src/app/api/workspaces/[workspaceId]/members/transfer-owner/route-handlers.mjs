import {
  transferWorkspaceOwnershipRequestSchema,
  transferWorkspaceOwnershipResponseSchema,
  workspaceErrorResponseSchema,
} from "../../../../../../shared/api/workspaces.mjs";
import {
  createAuthorizedUserContext,
  createInvalidSessionResponse,
  forwardJsonResponse,
  jsonResponse,
} from "../../../../../../core/api/next-proxy-helpers.mjs";

export function createWorkspaceTransferOwnerRouteHandlers({
  createSupabaseServerClient,
  getInternalApiUrl,
  fetchImplementation = globalThis.fetch,
}) {
  async function POST(request, context) {
    const authorizedUser = await createAuthorizedUserContext(createSupabaseServerClient);

    if (!authorizedUser) {
      return createInvalidSessionResponse();
    }

    const requestPayload = transferWorkspaceOwnershipRequestSchema.parse(
      await request.json().catch(() => ({})),
    );
    const { workspaceId } = await context.params;
    const upstream = await fetchImplementation(
      `${getInternalApiUrl()}/v1/workspaces/${encodeURIComponent(workspaceId)}/members/transfer-owner`,
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
              error: "workspace_transfer_failed",
              message: "The workspace ownership transfer request failed.",
            },
        { status },
      );
    }

    const parsedResponse = transferWorkspaceOwnershipResponseSchema.safeParse(payload);

    if (!parsedResponse.success) {
      return jsonResponse(
        {
          error: "workspace_transfer_failed",
          message: "The workspace ownership transfer response was invalid.",
        },
        { status: 502 },
      );
    }

    return jsonResponse(parsedResponse.data);
  }

  return {
    POST,
  };
}
