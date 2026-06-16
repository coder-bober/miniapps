import assert from "node:assert/strict";

import { createWorkspaceFileItemRouteHandlers } from "../../src/app/api/workspace-files/[id]/route-handlers.mjs";
import { createWorkspaceFileThumbnailRouteHandlers } from "../../src/app/api/workspace-files/[id]/thumbnail/route-handlers.mjs";

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

function createItemHandlers({
  moduleEnabled = true,
  accessToken = "token-123",
  workspaceAccess = {
    workspaceId: null,
    membershipRole: null,
    moduleRole: null,
    capabilities: ["workspace-files.read", "workspace-files.upload", "workspace-files.delete"],
  },
  fetchImplementation = async () => Response.json({ ok: true }),
} = {}) {
  return createWorkspaceFileItemRouteHandlers({
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

function createThumbnailHandlers({
  moduleEnabled = true,
  accessToken = "token-123",
  workspaceAccess = {
    workspaceId: null,
    membershipRole: null,
    moduleRole: null,
    capabilities: ["workspace-files.read", "workspace-files.upload", "workspace-files.delete"],
  },
  fetchImplementation = async () =>
    new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: {
        "content-type": "image/webp",
      },
    }),
} = {}) {
  return createWorkspaceFileThumbnailRouteHandlers({
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

async function readJson(response) {
  return await response.json();
}

async function runCase(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

await runCase("workspace file delete proxy forwards the file id to the internal API", async () => {
  let fetchCall = null;
  const handlers = createItemHandlers({
    fetchImplementation: async (url, init) => {
      fetchCall = { url, init };

      return Response.json({ ok: true });
    },
  });

  const response = await handlers.DELETE(new Request("http://localhost/api/workspace-files/file-123"), {
    params: Promise.resolve({
      id: "file-123",
    }),
  });

  assert.equal(response.status, 200);
  assert.ok(fetchCall);
  assert.equal(fetchCall.url, "http://internal-api.test/v1/workspace/files/file-123");
  assert.equal(fetchCall.init.method, "DELETE");
  assert.equal(fetchCall.init.headers.authorization, "Bearer token-123");
  assert.deepEqual(await readJson(response), { ok: true });
});

await runCase("workspace file delete proxy preserves upstream error payloads", async () => {
  const handlers = createItemHandlers({
    fetchImplementation: async () =>
      Response.json(
        {
          error: "workspace_file_not_found",
          message: "The workspace file was not found.",
        },
        { status: 404 },
      ),
  });

  const response = await handlers.DELETE(new Request("http://localhost/api/workspace-files/file-404"), {
    params: Promise.resolve({
      id: "file-404",
    }),
  });

  assert.equal(response.status, 404);
  assert.deepEqual(await readJson(response), {
    error: "workspace_file_not_found",
    message: "The workspace file was not found.",
  });
});

await runCase("workspace file delete proxy blocks delete when capability is missing", async () => {
  const handlers = createItemHandlers({
    workspaceAccess: {
      workspaceId: "workspace-1",
      membershipRole: "member",
      moduleRole: null,
      capabilities: ["workspace-files.read"],
    },
  });

  const response = await handlers.DELETE(new Request("http://localhost/api/workspace-files/file-123"), {
    params: Promise.resolve({
      id: "file-123",
    }),
  });

  assert.equal(response.status, 403);
  assert.deepEqual(await readJson(response), {
    error: "module_capability_required",
    message: "The current user lacks the required module capability.",
    requiredCapability: "workspace-files.delete",
  });
});

await runCase("workspace file thumbnail proxy returns binary data with the upstream content type", async () => {
  const handlers = createThumbnailHandlers({
    fetchImplementation: async () =>
      new Response(new Uint8Array([3, 4, 5]), {
        status: 200,
        headers: {
          "content-type": "image/png",
        },
      }),
  });

  const response = await handlers.GET(new Request("http://localhost/api/workspace-files/file-123/thumbnail"), {
    params: Promise.resolve({
      id: "file-123",
    }),
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(Array.from(new Uint8Array(await response.arrayBuffer())), [3, 4, 5]);
});

await runCase("workspace file thumbnail proxy preserves upstream error payloads", async () => {
  const handlers = createThumbnailHandlers({
    fetchImplementation: async () =>
      Response.json(
        {
          error: "workspace_thumbnail_not_ready",
          message: "The workspace thumbnail is not ready yet.",
        },
        { status: 409 },
      ),
  });

  const response = await handlers.GET(new Request("http://localhost/api/workspace-files/file-123/thumbnail"), {
    params: Promise.resolve({
      id: "file-123",
    }),
  });

  assert.equal(response.status, 409);
  assert.deepEqual(await readJson(response), {
    error: "workspace_thumbnail_not_ready",
    message: "The workspace thumbnail is not ready yet.",
  });
});

await runCase("workspace file thumbnail proxy blocks read when capability is missing", async () => {
  const handlers = createThumbnailHandlers({
    workspaceAccess: {
      workspaceId: "workspace-1",
      membershipRole: null,
      moduleRole: null,
      capabilities: [],
    },
  });

  const response = await handlers.GET(new Request("http://localhost/api/workspace-files/file-123/thumbnail"), {
    params: Promise.resolve({
      id: "file-123",
    }),
  });

  assert.equal(response.status, 403);
  assert.deepEqual(await readJson(response), {
    error: "module_capability_required",
    message: "The current user lacks the required module capability.",
    requiredCapability: "workspace-files.read",
  });
});
