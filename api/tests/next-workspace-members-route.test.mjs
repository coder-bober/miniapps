import assert from "node:assert/strict";

import { createWorkspaceMembersRouteHandlers } from "../../src/app/api/workspaces/[workspaceId]/members/route-handlers.mjs";

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
  accessToken = "token-123",
  fetchImplementation = async () => Response.json({ members: [] }),
} = {}) {
  return createWorkspaceMembersRouteHandlers({
    createSupabaseServerClient: createSupabaseServerClientStub({
      accessToken,
    }),
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

await runCase("workspace members Next proxy returns 401 when the session is missing", async () => {
  const handlers = createHandlers({
    accessToken: null,
  });

  const response = await handlers.GET(
    new Request("http://localhost/api/workspaces/workspace-1/members"),
    {
      params: Promise.resolve({ workspaceId: "workspace-1" }),
    },
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await readJson(response), {
    error: "invalid_session",
    message: "The current session is missing or invalid.",
  });
});

await runCase("workspace members Next proxy forwards the request to the internal API", async () => {
  let fetchCall = null;
  const handlers = createHandlers({
    fetchImplementation: async (url, init) => {
      fetchCall = { url, init };

      return Response.json({
        members: [
          {
            membershipId: "membership-1",
            workspaceId: "workspace-1",
            userId: "user-1",
            role: "owner",
            email: "owner@example.com",
            displayName: "Owner Person",
          },
        ],
      });
    },
  });

  const response = await handlers.GET(
    new Request("http://localhost/api/workspaces/workspace-1/members"),
    {
      params: Promise.resolve({ workspaceId: "workspace-1" }),
    },
  );

  assert.equal(response.status, 200);
  assert.equal(fetchCall.url, "http://internal-api.test/v1/workspaces/workspace-1/members");
  assert.equal(fetchCall.init.method, "GET");
  assert.equal(fetchCall.init.headers.authorization, "Bearer token-123");
  assert.deepEqual(await readJson(response), {
    members: [
      {
        membershipId: "membership-1",
        workspaceId: "workspace-1",
        userId: "user-1",
        role: "owner",
        email: "owner@example.com",
        displayName: "Owner Person",
      },
    ],
  });
});

await runCase("workspace members Next proxy preserves upstream error payloads", async () => {
  const handlers = createHandlers({
    fetchImplementation: async () =>
      Response.json(
        {
          error: "workspace_member_access_denied",
          message: "The current user is not allowed to view these workspace members.",
        },
        { status: 403 },
      ),
  });

  const response = await handlers.GET(
    new Request("http://localhost/api/workspaces/workspace-1/members"),
    {
      params: Promise.resolve({ workspaceId: "workspace-1" }),
    },
  );

  assert.equal(response.status, 403);
  assert.deepEqual(await readJson(response), {
    error: "workspace_member_access_denied",
    message: "The current user is not allowed to view these workspace members.",
  });
});

await runCase("workspace members Next proxy forwards member creation to the internal API", async () => {
  let fetchCall = null;
  const handlers = createHandlers({
    fetchImplementation: async (url, init) => {
      fetchCall = { url, init };

      return Response.json(
        {
          member: {
            membershipId: "membership-2",
            workspaceId: "workspace-1",
            userId: "user-2",
            role: "member",
            email: "member@example.com",
            displayName: "Member Person",
          },
        },
        { status: 201 },
      );
    },
  });

  const response = await handlers.POST(
    new Request("http://localhost/api/workspaces/workspace-1/members", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "member@example.com",
        role: "member",
      }),
    }),
    {
      params: Promise.resolve({ workspaceId: "workspace-1" }),
    },
  );

  assert.equal(response.status, 201);
  assert.equal(fetchCall.url, "http://internal-api.test/v1/workspaces/workspace-1/members");
  assert.equal(fetchCall.init.method, "POST");
  assert.equal(fetchCall.init.body, JSON.stringify({ email: "member@example.com", role: "member" }));
  assert.deepEqual(await readJson(response), {
    member: {
      membershipId: "membership-2",
      workspaceId: "workspace-1",
      userId: "user-2",
      role: "member",
      email: "member@example.com",
      displayName: "Member Person",
    },
  });
});
