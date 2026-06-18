import assert from "node:assert/strict";

import { createModuleLabRouteHandlers } from "../../src/app/api/module-lab/route-handlers.mjs";
import { readJson, runCase } from "./helpers/test-helpers.mjs";

function createSupabaseServerClientStub({ accessToken = "token-123", userId = "user-123", user = null } = {}) {
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
              user:
                user ??
                (accessToken
                  ? {
                      id: userId,
                    }
                  : null),
            },
          };
        },
      },
    };
  };
}

function createHandlers({
  moduleEnabled = true,
  moduleAccess = { role: "operator", capabilities: ["module-lab.read", "module-lab.run_job"] },
  workspaceModuleAccess = { membershipRole: "owner", moduleRole: "operator", capabilities: ["module-lab.read", "module-lab.run_job"] },
  accessToken = "token-123",
  userId = "user-123",
  user,
  fetchImplementation = async () =>
    Response.json({
      ok: true,
      jobId: "module-lab.echo",
      queue: "module-lab",
      queuedAt: "2026-03-28T00:00:00.000Z",
      message: "The module-lab job was queued.",
    }),
} = {}) {
  return createModuleLabRouteHandlers({
    isModuleEnabled(moduleId) {
      assert.equal(moduleId, "module-lab");
      return moduleEnabled;
    },
    createSupabaseServerClient: createSupabaseServerClientStub({
      accessToken,
      userId,
      user,
    }),
    async getCurrentUserModuleAccess(resolvedUserId, moduleId) {
      assert.equal(resolvedUserId, userId);
      assert.equal(moduleId, "module-lab");
      return moduleAccess;
    },
    async getCurrentUserWorkspaceModuleAccess(resolvedUserId, workspaceId, moduleId) {
      assert.equal(resolvedUserId, userId);
      assert.equal(moduleId, "module-lab");
      return {
        workspaceId,
        ...workspaceModuleAccess,
      };
    },
    getInternalApiUrl() {
      return "http://internal-api.test";
    },
    fetchImplementation,
  });
}

await runCase("module-lab Next proxy returns 404 when the module is disabled", async () => {
  const handlers = createHandlers({
    moduleEnabled: false,
  });

  const response = await handlers.GET(new Request("http://localhost/api/module-lab"));

  assert.equal(response.status, 404);
  assert.deepEqual(await readJson(response), {
    error: "module_disabled",
    message: "The module-lab module is disabled.",
  });
});

await runCase("module-lab Next proxy returns 401 when the session is missing", async () => {
  const handlers = createHandlers({
    accessToken: null,
  });

  const response = await handlers.GET(new Request("http://localhost/api/module-lab"));

  assert.equal(response.status, 401);
  assert.deepEqual(await readJson(response), {
    error: "invalid_session",
    message: "The current session is missing or invalid.",
  });
});

await runCase("module-lab Next proxy blocks viewer POST with a workspace capability error", async () => {
  const handlers = createHandlers({
    workspaceModuleAccess: {
      membershipRole: "member",
      moduleRole: "viewer",
      capabilities: ["module-lab.read"],
    },
  });

  const response = await handlers.POST(
    new Request("http://localhost/api/module-lab?bbb=workspace-1", {
      method: "POST",
      body: JSON.stringify({
        message: "viewer blocked",
      }),
      headers: {
        "content-type": "application/json",
      },
    }),
  );

  assert.equal(response.status, 403);
  assert.deepEqual(await readJson(response), {
    error: "module_capability_required",
    message: "The current user lacks the required module capability.",
    requiredCapability: "module-lab.run_job",
  });
});

await runCase("module-lab Next proxy blocks GET for a signed-in user without workspace module access", async () => {
  const handlers = createHandlers({
    workspaceModuleAccess: {
      membershipRole: null,
      moduleRole: null,
      capabilities: [],
    },
  });

  const response = await handlers.GET(new Request("http://localhost/api/module-lab?bbb=workspace-1"));

  assert.equal(response.status, 403);
  assert.deepEqual(await readJson(response), {
    error: "module_capability_required",
    message: "The current user lacks the required module capability.",
    requiredCapability: "module-lab.read",
  });
});

await runCase("module-lab Next proxy requires an explicit workspace by default", async () => {
  const handlers = createHandlers({
    async fetchImplementation() {
      throw new Error("Module-lab proxy should not call the internal API without a workspace.");
    },
  });

  const response = await handlers.GET(new Request("http://localhost/api/module-lab"));

  assert.equal(response.status, 400);
  assert.deepEqual(await readJson(response), {
    error: "workspace_required",
    message: "A workspaceId is required for authenticated module-lab requests.",
  });
});

await runCase("module-lab Next proxy forwards operator POST to the internal API", async () => {
  let fetchCall = null;
  const handlers = createHandlers({
    fetchImplementation: async (url, init) => {
      fetchCall = { url, init };

      return Response.json({
        ok: true,
        jobId: "module-lab.echo",
        queue: "module-lab",
        queuedAt: "2026-03-28T00:00:00.000Z",
        message: "The module-lab job was queued.",
      });
    },
  });

  const response = await handlers.POST(
    new Request("http://localhost/api/module-lab?bbb=workspace-1", {
      method: "POST",
      body: JSON.stringify({
        message: "forward me",
      }),
      headers: {
        "content-type": "application/json",
      },
    }),
  );

  assert.equal(response.status, 200);
  assert.ok(fetchCall);
  assert.equal(String(fetchCall.url), "http://internal-api.test/v1/module-lab/job?workspaceId=workspace-1");
  assert.equal(fetchCall.init.method, "POST");
  assert.equal(fetchCall.init.headers.authorization, "Bearer token-123");
  assert.equal(fetchCall.init.body, JSON.stringify({ message: "forward me" }));
  assert.deepEqual(await readJson(response), {
    ok: true,
    jobId: "module-lab.echo",
    queue: "module-lab",
    queuedAt: "2026-03-28T00:00:00.000Z",
    message: "The module-lab job was queued.",
  });
});

await runCase("module-lab Next proxy preserves upstream error payloads", async () => {
  const handlers = createHandlers({
    fetchImplementation: async () =>
      Response.json(
        {
          error: "module_lab_failed",
          message: "The module-lab request failed upstream.",
        },
        { status: 502 },
      ),
  });

  const response = await handlers.GET(new Request("http://localhost/api/module-lab?bbb=workspace-1"));

  assert.equal(response.status, 502);
  assert.deepEqual(await readJson(response), {
    error: "module_lab_failed",
    message: "The module-lab request failed upstream.",
  });
});

await runCase("module-lab Next proxy forwards selected bbb workspace to the internal API", async () => {
  let fetchCall = null;
  const handlers = createHandlers({
    fetchImplementation: async (url, init) => {
      fetchCall = { url: String(url), init };

      return Response.json({
        module: {
          id: "module-lab",
          label: "Module Lab",
        },
        role: "viewer",
        capabilities: ["module-lab.read"],
        jobs: [],
      });
    },
  });

  const response = await handlers.GET(
    new Request("http://localhost/api/module-lab?bbb=workspace-public-123"),
  );

  assert.equal(response.status, 200);
  assert.ok(fetchCall);
  assert.equal(
    fetchCall.url,
    "http://internal-api.test/v1/module-lab?workspaceId=workspace-public-123",
  );
});
