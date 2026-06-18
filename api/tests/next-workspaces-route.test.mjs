import assert from "node:assert/strict";

import { createWorkspacesRouteHandlers } from "../../src/app/api/workspaces/route-handlers.mjs";
import { createNextProxyDependencies, readJson, runCase } from "./helpers/test-helpers.mjs";

function createHandlers({
  accessToken = "token-123",
  fetchImplementation = async () =>
    Response.json({
      workspaces: [],
    }),
} = {}) {
  return createWorkspacesRouteHandlers(
    createNextProxyDependencies({
      accessToken,
      fetchImplementation,
    }),
  );
}

await runCase("workspaces Next proxy returns 401 when the session is missing", async () => {
  const handlers = createHandlers({
    accessToken: null,
  });

  const response = await handlers.GET();

  assert.equal(response.status, 401);
  assert.deepEqual(await readJson(response), {
    error: "invalid_session",
    message: "The current session is missing or invalid.",
  });
});

await runCase("workspaces Next proxy forwards the request to the internal API", async () => {
  let fetchCall = null;
  const handlers = createHandlers({
    fetchImplementation: async (url, init) => {
      fetchCall = { url, init };

      return Response.json({
        workspaces: [
          {
            id: "workspace-1",
            slug: "default",
            name: "Personal workspace",
            kind: "personal",
            membershipRole: "owner",
          },
        ],
      });
    },
  });

  const response = await handlers.GET();

  assert.equal(response.status, 200);
  assert.equal(fetchCall.url, "http://internal-api.test/v1/workspaces");
  assert.equal(fetchCall.init.method, "GET");
  assert.equal(fetchCall.init.headers.authorization, "Bearer token-123");
  assert.deepEqual(await readJson(response), {
    workspaces: [
      {
        id: "workspace-1",
        slug: "default",
        name: "Personal workspace",
        kind: "personal",
        membershipRole: "owner",
      },
    ],
  });
});

await runCase("workspaces Next proxy preserves upstream error payloads", async () => {
  const handlers = createHandlers({
    fetchImplementation: async () =>
      Response.json(
        {
          error: "workspace_list_failed",
          message: "The backend could not load the workspace list.",
        },
        { status: 500 },
      ),
  });

  const response = await handlers.GET();

  assert.equal(response.status, 500);
  assert.deepEqual(await readJson(response), {
    error: "workspace_list_failed",
    message: "The backend could not load the workspace list.",
  });
});

await runCase("workspaces Next proxy forwards workspace creation to the internal API", async () => {
  let fetchCall = null;
  const handlers = createHandlers({
    fetchImplementation: async (url, init) => {
      fetchCall = { url, init };

      return Response.json(
        {
          workspace: {
            id: "workspace-2",
            slug: "team-ops-abc123",
            name: "Team Ops",
            kind: "shared",
            membershipRole: "owner",
          },
        },
        { status: 201 },
      );
    },
  });

  const response = await handlers.POST(
    new Request("http://localhost/api/workspaces", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Team Ops",
      }),
    }),
  );

  assert.equal(response.status, 201);
  assert.equal(fetchCall.url, "http://internal-api.test/v1/workspaces");
  assert.equal(fetchCall.init.method, "POST");
  assert.equal(fetchCall.init.headers.authorization, "Bearer token-123");
  assert.equal(fetchCall.init.body, JSON.stringify({ name: "Team Ops" }));
  assert.deepEqual(await readJson(response), {
    workspace: {
      id: "workspace-2",
      slug: "team-ops-abc123",
      name: "Team Ops",
      kind: "shared",
      membershipRole: "owner",
    },
  });
});
