import {
  moduleLabErrorResponseSchema,
  moduleLabRunJobRequestSchema,
  moduleLabRunJobResponseSchema,
  moduleLabStatusResponseSchema,
} from "../../../shared/api/module-lab.mjs";
import {
  createAuthorizedUserContext,
  createInvalidSessionResponse,
  createModuleDisabledResponse,
  forwardJsonResponse,
  jsonResponse,
} from "../../../core/api/next-proxy-helpers.mjs";

function forbiddenResponse(requiredCapability) {
  return jsonResponse(
    {
      error: "module_capability_required",
      message: "The current user lacks the required module capability.",
      requiredCapability,
    },
    { status: 403 },
  );
}

function workspaceRequiredResponse() {
  return jsonResponse(
    {
      error: "workspace_required",
      message: "A workspaceId is required for authenticated module-lab requests.",
    },
    { status: 400 },
  );
}

async function createAuthorizedHeaders(createSupabaseServerClient) {
  const authorizedUser = await createAuthorizedUserContext(createSupabaseServerClient);

  if (!authorizedUser) {
    return null;
  }

  return {
    userId: authorizedUser.userId,
    authorization: authorizedUser.authorization,
    "content-type": "application/json",
  };
}

function readRequestedWorkspaceId(request) {
  const url = new URL(request.url);
  const rawValue = url.searchParams.get("bbb");

  if (!rawValue) {
    return null;
  }

  const trimmed = rawValue.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function createModuleLabRouteHandlers({
  isModuleEnabled,
  createSupabaseServerClient,
  getCurrentUserWorkspaceModuleAccess,
  getInternalApiUrl,
  fetchImplementation = globalThis.fetch,
}) {
  async function GET(request) {
    if (!isModuleEnabled("module-lab")) {
      return createModuleDisabledResponse({
        error: "module_disabled",
        message: "The module-lab module is disabled.",
      });
    }

    const authorizedHeaders = await createAuthorizedHeaders(createSupabaseServerClient);

    if (!authorizedHeaders) {
      return createInvalidSessionResponse();
    }

    const requestedWorkspaceId = readRequestedWorkspaceId(request);

    if (!requestedWorkspaceId) {
      return workspaceRequiredResponse();
    }

    const moduleAccess = await getCurrentUserWorkspaceModuleAccess(
      authorizedHeaders.userId,
      requestedWorkspaceId,
      "module-lab",
    );

    if (!moduleAccess.capabilities.includes("module-lab.read")) {
      return forbiddenResponse("module-lab.read");
    }

    const upstreamUrl = new URL(`${getInternalApiUrl()}/v1/module-lab`);

    if (requestedWorkspaceId) {
      upstreamUrl.searchParams.set("workspaceId", requestedWorkspaceId);
    }

    const upstream = await fetchImplementation(upstreamUrl, {
      method: "GET",
      headers: {
        authorization: authorizedHeaders.authorization,
        "content-type": authorizedHeaders["content-type"],
      },
      cache: "no-store",
    });
    const { ok, status, payload } = await forwardJsonResponse(upstream);

    if (!ok) {
      const parsedError = moduleLabErrorResponseSchema.safeParse(payload);

      return jsonResponse(
        parsedError.success
          ? parsedError.data
          : {
              error: "module_lab_failed",
              message: "The module-lab request failed.",
            },
        { status },
      );
    }

    const parsedResponse = moduleLabStatusResponseSchema.safeParse(payload);

    if (!parsedResponse.success) {
      return jsonResponse(
        {
          error: "module_lab_failed",
          message: "The module-lab status response was invalid.",
        },
        { status: 502 },
      );
    }

    return jsonResponse(parsedResponse.data);
  }

  async function POST(request) {
    if (!isModuleEnabled("module-lab")) {
      return createModuleDisabledResponse({
        error: "module_disabled",
        message: "The module-lab module is disabled.",
      });
    }

    const authorizedHeaders = await createAuthorizedHeaders(createSupabaseServerClient);

    if (!authorizedHeaders) {
      return createInvalidSessionResponse();
    }

    const requestedWorkspaceId = readRequestedWorkspaceId(request);

    if (!requestedWorkspaceId) {
      return workspaceRequiredResponse();
    }

    const moduleAccess = await getCurrentUserWorkspaceModuleAccess(
      authorizedHeaders.userId,
      requestedWorkspaceId,
      "module-lab",
    );

    if (!moduleAccess.capabilities.includes("module-lab.run_job")) {
      return forbiddenResponse("module-lab.run_job");
    }

    const requestPayload = moduleLabRunJobRequestSchema.parse(await request.json().catch(() => ({})));
    const upstreamUrl = new URL(`${getInternalApiUrl()}/v1/module-lab/job`);

    if (requestedWorkspaceId) {
      upstreamUrl.searchParams.set("workspaceId", requestedWorkspaceId);
    }

    const upstream = await fetchImplementation(upstreamUrl, {
      method: "POST",
      headers: {
        authorization: authorizedHeaders.authorization,
        "content-type": authorizedHeaders["content-type"],
      },
      body: JSON.stringify(requestPayload),
      cache: "no-store",
    });
    const { ok, status, payload } = await forwardJsonResponse(upstream);

    if (!ok) {
      const parsedError = moduleLabErrorResponseSchema.safeParse(payload);

      return jsonResponse(
        parsedError.success
          ? parsedError.data
          : {
              error: "module_lab_failed",
              message: "The module-lab job request failed.",
            },
        { status },
      );
    }

    const parsedResponse = moduleLabRunJobResponseSchema.safeParse(payload);

    if (!parsedResponse.success) {
      return jsonResponse(
        {
          error: "module_lab_failed",
          message: "The module-lab job response was invalid.",
        },
        { status: 502 },
      );
    }

    return jsonResponse(parsedResponse.data);
  }

  return {
    GET,
    POST,
  };
}
