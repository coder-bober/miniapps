import assert from "node:assert/strict";

import { buildApiApp } from "../app.mjs";
import { createServices, runCase } from "./helpers/route-test-helpers.mjs";

await runCase("GET /v1/workspaces rejects requests without authorization", async () => {
  const app = buildApiApp({
    services: createServices(),
  });

  try {
    const response = await app.inject({
      method: "GET",
      url: "/v1/workspaces",
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error, "authorization_required");
  } finally {
    await app.close();
  }
});

await runCase("GET /v1/workspaces returns workspaces for the verified account", async () => {
  const app = buildApiApp({
    services: createServices({
      async listUserWorkspaces({ userId }) {
        assert.equal(userId, "user-123");

        return [
          {
            id: "workspace-1",
            slug: "default",
            name: "Personal workspace",
            kind: "personal",
            membershipRole: "owner",
          },
          {
            id: "workspace-2",
            slug: "shared-team",
            name: "Shared team",
            kind: "shared",
            membershipRole: "member",
          },
        ];
      },
    }),
  });

  try {
    const response = await app.inject({
      method: "GET",
      url: "/v1/workspaces",
      headers: {
        authorization: "Bearer valid-token",
      },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().workspaces.length, 2);
    assert.equal(response.json().workspaces[1].slug, "shared-team");
  } finally {
    await app.close();
  }
});

await runCase("POST /v1/workspaces creates a shared workspace for the verified account", async () => {
  const created = [];
  const app = buildApiApp({
    services: createServices({
      async createSharedWorkspace({ userId, name }) {
        created.push({ userId, name });
        return {
          id: "workspace-3",
          slug: "team-ops-abc123",
          name,
          kind: "shared",
          membershipRole: "owner",
        };
      },
    }),
  });

  try {
    const response = await app.inject({
      method: "POST",
      url: "/v1/workspaces",
      headers: {
        authorization: "Bearer valid-token",
      },
      payload: {
        name: "Team Ops",
      },
    });

    assert.equal(response.statusCode, 201);
    assert.deepEqual(created, [{ userId: "user-123", name: "Team Ops" }]);
    assert.equal(response.json().workspace.slug, "team-ops-abc123");
  } finally {
    await app.close();
  }
});
