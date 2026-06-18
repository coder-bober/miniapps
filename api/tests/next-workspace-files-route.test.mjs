import assert from "node:assert/strict";

import { createWorkspaceFilesRouteHandlers } from "../../src/app/api/workspace-files/route-handlers.mjs";
import { readJson, runCase } from "./helpers/test-helpers.mjs";

function createSupabaseServerClientStub({ accessToken = "token-123", userId = "user-123" } = {}) {
  return async function createSupabaseServerClient() {
    return {
      auth: {
        async getSession() {
          return {
            data: {
              session: accessToken
                ? {
                    access_token: accessToken,
                  }
                : null,
            },
          };
        },
        async getUser(token) {
          assert.equal(token, accessToken);

          return {
            data: {
              user: accessToken
                ? {
                    id: userId,
                  }
                : null,
            },
          };
        },
      },
    };
  };
}

function createHandlers({
  moduleEnabled = true,
  accessToken = "token-123",
  workspaceAccess = {
    workspaceId: null,
    membershipRole: null,
    moduleRole: null,
    capabilities: ["workspace-files.read", "workspace-files.upload", "workspace-files.delete"],
  },
  fetchImplementation = async () =>
    Response.json({
      workspace: {
        workspaceId: workspaceAccess.workspaceId,
        workspaceSlug: "default",
      },
      files: [],
    }),
} = {}) {
  return createWorkspaceFilesRouteHandlers({
    isModuleEnabled(moduleId) {
      assert.equal(moduleId, "workspace-files");
      return moduleEnabled;
    },
    createSupabaseServerClient: createSupabaseServerClientStub({
      accessToken,
    }),
    async getCurrentUserWorkspaceModuleAccess(userId, workspaceId, moduleId) {
      assert.equal(userId, "user-123");
      assert.equal(moduleId, "workspace-files");
      assert.equal(workspaceId, workspaceAccess.workspaceId);
      return workspaceAccess;
    },
    async getCurrentUserDefaultWorkspaceContext(userId, workspaceId, workspaceSlug) {
      assert.equal(userId, "user-123");
      assert.equal(workspaceId, null);
      return {
        workspaceId: workspaceId ?? (workspaceSlug === "default" ? workspaceAccess.workspaceId : null),
        workspaceSlug,
      };
    },
    getInternalApiUrl() {
      return "http://internal-api.test";
    },
    fetchImplementation,
  });
}

await runCase("workspace-files Next proxy returns 404 when the module is disabled", async () => {
  const handlers = createHandlers({
    moduleEnabled: false,
  });

  const response = await handlers.GET(new Request("http://localhost/api/workspace-files"));

  assert.equal(response.status, 404);
  assert.deepEqual(await readJson(response), {
    error: "workspace_file_not_found",
    message: "The workspace files module is disabled.",
  });
});

await runCase("workspace-files Next proxy returns 401 when the session is missing", async () => {
  const handlers = createHandlers({
    accessToken: null,
  });

  const response = await handlers.GET(new Request("http://localhost/api/workspace-files"));

  assert.equal(response.status, 401);
  assert.deepEqual(await readJson(response), {
    error: "invalid_session",
    message: "The current session is missing or invalid.",
  });
});

await runCase("workspace-files Next proxy forwards workspaceSlug to the internal API", async () => {
  let fetchCall = null;
  const handlers = createHandlers({
    fetchImplementation: async (url, init) => {
      fetchCall = { url, init };

      return Response.json({
        workspace: {
          workspaceId: null,
          workspaceSlug: "alpha-space",
        },
        files: [],
      });
    },
  });

  const response = await handlers.GET(
    new Request("http://localhost/api/workspace-files?workspaceSlug=alpha-space"),
  );

  assert.equal(response.status, 200);
  assert.ok(fetchCall);
  assert.equal(
    fetchCall.url,
    "http://internal-api.test/v1/workspace/files?workspaceSlug=alpha-space",
  );
  assert.equal(fetchCall.init.method, "GET");
  assert.equal(fetchCall.init.headers.authorization, "Bearer token-123");
  assert.deepEqual(await readJson(response), {
    workspace: {
      workspaceId: null,
      workspaceSlug: "alpha-space",
    },
    files: [],
  });
});

await runCase("workspace-files Next proxy blocks GET when workspace membership/capability is missing", async () => {
  const handlers = createHandlers({
    workspaceAccess: {
      workspaceId: "workspace-1",
      membershipRole: null,
      moduleRole: null,
      capabilities: [],
    },
  });

  const response = await handlers.GET(
    new Request("http://localhost/api/workspace-files?workspaceSlug=default"),
  );

  assert.equal(response.status, 403);
  assert.deepEqual(await readJson(response), {
    error: "module_capability_required",
    message: "The current user lacks the required module capability.",
    requiredCapability: "workspace-files.read",
  });
});

await runCase("workspace-files Next proxy preserves upstream error payloads", async () => {
  const handlers = createHandlers({
    fetchImplementation: async () =>
      Response.json(
        {
          error: "workspace_storage_unreachable",
          message: "The storage endpoint could not be reached.",
        },
        { status: 503 },
      ),
  });

  const response = await handlers.POST(
    new Request("http://localhost/api/workspace-files", {
      method: "POST",
      body: new FormData(),
    }),
  );

  assert.equal(response.status, 503);
  assert.deepEqual(await readJson(response), {
    error: "workspace_storage_unreachable",
    message: "The storage endpoint could not be reached.",
  });
});

await runCase("workspace-files Next proxy blocks POST when upload capability is missing", async () => {
  const handlers = createHandlers({
    workspaceAccess: {
      workspaceId: "workspace-1",
      membershipRole: "member",
      moduleRole: null,
      capabilities: ["workspace-files.read"],
    },
  });

  const formData = new FormData();
  formData.set("workspaceSlug", "default");

  const response = await handlers.POST(
    new Request("http://localhost/api/workspace-files", {
      method: "POST",
      body: formData,
    }),
  );

  assert.equal(response.status, 403);
  assert.deepEqual(await readJson(response), {
    error: "module_capability_required",
    message: "The current user lacks the required module capability.",
    requiredCapability: "workspace-files.upload",
  });
});

await runCase("workspace-files Next proxy forwards resolved workspaceId to the internal API", async () => {
  let fetchCall = null;
  const handlers = createHandlers({
    workspaceAccess: {
      workspaceId: "workspace-1",
      membershipRole: "member",
      moduleRole: null,
      capabilities: ["workspace-files.read", "workspace-files.upload", "workspace-files.delete"],
    },
    fetchImplementation: async (url, init) => {
      fetchCall = { url, init };

      return Response.json({
        workspace: {
          workspaceId: "workspace-1",
          workspaceSlug: "default",
        },
        files: [],
      });
    },
  });

  const response = await handlers.GET(new Request("http://localhost/api/workspace-files?workspaceSlug=default"));

  assert.equal(response.status, 200);
  assert.equal(
    fetchCall.url,
    "http://internal-api.test/v1/workspace/files?workspaceSlug=default&workspaceId=workspace-1",
  );
  assert.deepEqual(await readJson(response), {
    workspace: {
      workspaceId: "workspace-1",
      workspaceSlug: "default",
    },
    files: [],
  });
});
