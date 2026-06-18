import assert from "node:assert/strict";

import { createWorkspaceMemberItemRouteHandlers } from "../../src/app/api/workspaces/[workspaceId]/members/[userId]/route-handlers.mjs";
import { createWorkspaceTransferOwnerRouteHandlers } from "../../src/app/api/workspaces/[workspaceId]/members/transfer-owner/route-handlers.mjs";
import { createNextProxyDependencies, readJson, runCase } from "./helpers/test-helpers.mjs";

function createMemberItemHandlers({
  accessToken = "token-123",
  fetchImplementation = async () => Response.json({ ok: true }),
} = {}) {
  return createWorkspaceMemberItemRouteHandlers(
    createNextProxyDependencies({
      accessToken,
      fetchImplementation,
    }),
  );
}

function createTransferHandlers({
  accessToken = "token-123",
  fetchImplementation = async () => Response.json({ ok: true }),
} = {}) {
  return createWorkspaceTransferOwnerRouteHandlers(
    createNextProxyDependencies({
      accessToken,
      fetchImplementation,
    }),
  );
}

await runCase("workspace member item Next proxy forwards role updates to the internal API", async () => {
  let fetchCall = null;
  const handlers = createMemberItemHandlers({
    fetchImplementation: async (url, init) => {
      fetchCall = { url, init };

      return Response.json({
        member: {
          membershipId: "membership-2",
          workspaceId: "workspace-1",
          userId: "user-2",
          role: "admin",
          email: "member@example.com",
          displayName: "Member Person",
        },
      });
    },
  });

  const response = await handlers.PATCH(
    new Request("http://localhost/api/workspaces/workspace-1/members/user-2", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        role: "admin",
      }),
    }),
    {
      params: Promise.resolve({ workspaceId: "workspace-1", userId: "user-2" }),
    },
  );

  assert.equal(response.status, 200);
  assert.equal(fetchCall.url, "http://internal-api.test/v1/workspaces/workspace-1/members/user-2");
  assert.equal(fetchCall.init.method, "PATCH");
  assert.equal(fetchCall.init.body, JSON.stringify({ role: "admin" }));
  assert.deepEqual(await readJson(response), {
    member: {
      membershipId: "membership-2",
      workspaceId: "workspace-1",
      userId: "user-2",
      role: "admin",
      email: "member@example.com",
      displayName: "Member Person",
    },
  });
});

await runCase("workspace member item Next proxy forwards member removal to the internal API", async () => {
  let fetchCall = null;
  const handlers = createMemberItemHandlers({
    fetchImplementation: async (url, init) => {
      fetchCall = { url, init };

      return Response.json({
        ok: true,
      });
    },
  });

  const response = await handlers.DELETE(
    new Request("http://localhost/api/workspaces/workspace-1/members/user-2", {
      method: "DELETE",
    }),
    {
      params: Promise.resolve({ workspaceId: "workspace-1", userId: "user-2" }),
    },
  );

  assert.equal(response.status, 200);
  assert.equal(fetchCall.url, "http://internal-api.test/v1/workspaces/workspace-1/members/user-2");
  assert.equal(fetchCall.init.method, "DELETE");
  assert.deepEqual(await readJson(response), {
    ok: true,
  });
});

await runCase("workspace transfer Next proxy forwards the request to the internal API", async () => {
  let fetchCall = null;
  const handlers = createTransferHandlers({
    fetchImplementation: async (url, init) => {
      fetchCall = { url, init };

      return Response.json({
        ok: true,
      });
    },
  });

  const response = await handlers.POST(
    new Request("http://localhost/api/workspaces/workspace-1/members/transfer-owner", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        newOwnerUserId: "user-2",
      }),
    }),
    {
      params: Promise.resolve({ workspaceId: "workspace-1" }),
    },
  );

  assert.equal(response.status, 200);
  assert.equal(
    fetchCall.url,
    "http://internal-api.test/v1/workspaces/workspace-1/members/transfer-owner",
  );
  assert.equal(fetchCall.init.method, "POST");
  assert.equal(fetchCall.init.body, JSON.stringify({ newOwnerUserId: "user-2" }));
  assert.deepEqual(await readJson(response), {
    ok: true,
  });
});
