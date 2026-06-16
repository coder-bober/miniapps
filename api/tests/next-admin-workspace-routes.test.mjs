import assert from "node:assert/strict";

import { createAdminWorkspacesRouteHandlers } from "../../src/app/api/admin/workspaces/route-handlers.mjs";
import { createAdminWorkspaceMembersRouteHandlers } from "../../src/app/api/admin/workspaces/[workspaceId]/members/route-handlers.mjs";
import { createAdminWorkspaceMemberItemRouteHandlers } from "../../src/app/api/admin/workspaces/[workspaceId]/members/[userId]/route-handlers.mjs";
import { createAdminWorkspaceModuleLabRolesRouteHandlers } from "../../src/app/api/admin/workspaces/[workspaceId]/module-roles/module-lab/route-handlers.mjs";
import { createAdminWorkspaceModuleLabRoleItemRouteHandlers } from "../../src/app/api/admin/workspaces/[workspaceId]/module-roles/module-lab/[userId]/route-handlers.mjs";

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

function createDependencies({
  accessToken = "token-123",
  fetchImplementation = async () => Response.json({ workspaces: [] }),
} = {}) {
  return {
    createSupabaseServerClient: createSupabaseServerClientStub({
      accessToken,
    }),
    getInternalApiUrl() {
      return "http://internal-api.test";
    },
    fetchImplementation,
  };
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

await runCase("admin workspaces Next proxy returns 401 when the session is missing", async () => {
  const handlers = createAdminWorkspacesRouteHandlers(
    createDependencies({
      accessToken: null,
    }),
  );

  const response = await handlers.GET(new Request("http://localhost/api/admin/workspaces"));

  assert.equal(response.status, 401);
  assert.deepEqual(await readJson(response), {
    error: "invalid_session",
    message: "The current session is missing or invalid.",
  });
});

await runCase("admin workspaces Next proxy forwards limit to the internal API", async () => {
  let fetchCall = null;
  const handlers = createAdminWorkspacesRouteHandlers(
    createDependencies({
      fetchImplementation: async (url, init) => {
        fetchCall = { url, init };
        return Response.json({
          workspaces: [
            {
              id: "workspace-1",
              slug: "alpha",
              name: "Alpha",
              kind: "shared",
              createdAt: "2026-06-16T00:00:00.000Z",
            },
          ],
        });
      },
    }),
  );

  const response = await handlers.GET(new Request("http://localhost/api/admin/workspaces?limit=12"));

  assert.equal(response.status, 200);
  assert.equal(fetchCall.url, "http://internal-api.test/v1/admin/workspaces?limit=12");
  assert.equal(fetchCall.init.method, "GET");
  assert.equal(fetchCall.init.headers.authorization, "Bearer token-123");
  assert.equal(fetchCall.init.cache, "no-store");
  assert.equal((await readJson(response)).workspaces[0].id, "workspace-1");
});

await runCase("admin workspaces Next proxy preserves upstream app-admin denial", async () => {
  const handlers = createAdminWorkspacesRouteHandlers(
    createDependencies({
      fetchImplementation: async () =>
        Response.json(
          {
            error: "app_admin_required",
            message: "The current user is not allowed to use app-admin tools.",
          },
          { status: 403 },
        ),
    }),
  );

  const response = await handlers.GET(new Request("http://localhost/api/admin/workspaces"));

  assert.equal(response.status, 403);
  assert.deepEqual(await readJson(response), {
    error: "app_admin_required",
    message: "The current user is not allowed to use app-admin tools.",
  });
});

await runCase("admin workspace members Next proxy forwards member list requests", async () => {
  let fetchCall = null;
  const handlers = createAdminWorkspaceMembersRouteHandlers(
    createDependencies({
      fetchImplementation: async (url, init) => {
        fetchCall = { url, init };
        return Response.json({
          members: [
            {
              membershipId: "membership-1",
              workspaceId: "workspace-1",
              userId: "member-2",
              role: "member",
              email: "member@example.com",
              displayName: "Member",
            },
          ],
        });
      },
    }),
  );

  const response = await handlers.GET(new Request("http://localhost/api/admin/workspaces/workspace-1/members"), {
    params: Promise.resolve({ workspaceId: "workspace-1" }),
  });

  assert.equal(response.status, 200);
  assert.equal(fetchCall.url, "http://internal-api.test/v1/admin/workspaces/workspace-1/members");
  assert.equal(fetchCall.init.method, "GET");
  assert.equal((await readJson(response)).members[0].userId, "member-2");
});

await runCase("admin workspace member item Next proxy forwards role updates", async () => {
  let fetchCall = null;
  const handlers = createAdminWorkspaceMemberItemRouteHandlers(
    createDependencies({
      fetchImplementation: async (url, init) => {
        fetchCall = { url, init };
        return Response.json({
          member: {
            membershipId: "membership-1",
            workspaceId: "workspace-1",
            userId: "member-2",
            role: "admin",
            email: "member@example.com",
            displayName: "Member",
          },
        });
      },
    }),
  );

  const response = await handlers.PATCH(
    new Request("http://localhost/api/admin/workspaces/workspace-1/members/member-2", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ role: "admin" }),
    }),
    {
      params: Promise.resolve({ workspaceId: "workspace-1", userId: "member-2" }),
    },
  );

  assert.equal(response.status, 200);
  assert.equal(fetchCall.url, "http://internal-api.test/v1/admin/workspaces/workspace-1/members/member-2");
  assert.equal(fetchCall.init.method, "PATCH");
  assert.equal(fetchCall.init.headers.authorization, "Bearer token-123");
  assert.equal(fetchCall.init.headers["content-type"], "application/json");
  assert.equal(fetchCall.init.body, JSON.stringify({ role: "admin" }));
  assert.equal((await readJson(response)).member.role, "admin");
});

await runCase("admin module-lab Next proxy forwards list requests", async () => {
  let fetchCall = null;
  const handlers = createAdminWorkspaceModuleLabRolesRouteHandlers(
    createDependencies({
      fetchImplementation: async (url, init) => {
        fetchCall = { url, init };
        return Response.json({
          moduleRoles: [
            {
              workspaceId: "workspace-1",
              userId: "member-2",
              moduleId: "module-lab",
              role: "viewer",
            },
          ],
        });
      },
    }),
  );

  const response = await handlers.GET(
    new Request("http://localhost/api/admin/workspaces/workspace-1/module-roles/module-lab"),
    {
      params: Promise.resolve({ workspaceId: "workspace-1" }),
    },
  );

  assert.equal(response.status, 200);
  assert.equal(fetchCall.url, "http://internal-api.test/v1/admin/workspaces/workspace-1/module-roles/module-lab");
  assert.equal(fetchCall.init.method, "GET");
  assert.equal((await readJson(response)).moduleRoles[0].role, "viewer");
});

await runCase("admin module-lab item Next proxy forwards update and delete requests", async () => {
  const calls = [];
  const handlers = createAdminWorkspaceModuleLabRoleItemRouteHandlers(
    createDependencies({
      fetchImplementation: async (url, init) => {
        calls.push({ url, init });

        if (init.method === "PATCH") {
          return Response.json({
            moduleRole: {
              workspaceId: "workspace-1",
              userId: "member-2",
              moduleId: "module-lab",
              role: "operator",
            },
          });
        }

        return Response.json({ ok: true });
      },
    }),
  );

  const patchResponse = await handlers.PATCH(
    new Request("http://localhost/api/admin/workspaces/workspace-1/module-roles/module-lab/member-2", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ role: "operator" }),
    }),
    {
      params: Promise.resolve({ workspaceId: "workspace-1", userId: "member-2" }),
    },
  );
  const deleteResponse = await handlers.DELETE(
    new Request("http://localhost/api/admin/workspaces/workspace-1/module-roles/module-lab/member-2"),
    {
      params: Promise.resolve({ workspaceId: "workspace-1", userId: "member-2" }),
    },
  );

  assert.equal(patchResponse.status, 200);
  assert.equal(deleteResponse.status, 200);
  assert.deepEqual(
    calls.map((call) => ({
      url: call.url,
      method: call.init.method,
      body: call.init.body ?? null,
    })),
    [
      {
        url: "http://internal-api.test/v1/admin/workspaces/workspace-1/module-roles/module-lab/member-2",
        method: "PATCH",
        body: JSON.stringify({ role: "operator" }),
      },
      {
        url: "http://internal-api.test/v1/admin/workspaces/workspace-1/module-roles/module-lab/member-2",
        method: "DELETE",
        body: null,
      },
    ],
  );
  assert.equal((await readJson(patchResponse)).moduleRole.role, "operator");
  assert.deepEqual(await readJson(deleteResponse), { ok: true });
});
