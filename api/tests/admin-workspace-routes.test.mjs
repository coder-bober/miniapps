import assert from "node:assert/strict";

import { buildApiApp } from "../app.mjs";
import { createQueueService } from "../core/queue/service.mjs";

function createServices(overrides = {}) {
  return {
    async verifyAccessToken() {
      return {
        id: "user-123",
        email: "admin@example.com",
      };
    },
    async listAdminWorkspaces() {
      return [];
    },
    async listAdminWorkspaceMembers() {
      return [];
    },
    async updateAdminWorkspaceMemberRole() {
      return {
        membershipId: "membership-1",
        workspaceId: "workspace-1",
        userId: "member-2",
        role: "admin",
        email: "member@example.com",
        displayName: "Member",
      };
    },
    async listAdminWorkspaceModuleRoles() {
      return [];
    },
    async updateAdminWorkspaceModuleRole() {
      return {
        workspaceId: "workspace-1",
        userId: "member-2",
        moduleId: "module-lab",
        role: "operator",
      };
    },
    async deleteAdminWorkspaceModuleRole() {},
    ...createQueueService(),
    ...overrides,
  };
}

async function withAppAdminEmails(value, fn) {
  const originalValue = process.env.APP_ADMIN_EMAILS;

  try {
    if (value === undefined) {
      delete process.env.APP_ADMIN_EMAILS;
    } else {
      process.env.APP_ADMIN_EMAILS = value;
    }

    await fn();
  } finally {
    if (originalValue === undefined) {
      delete process.env.APP_ADMIN_EMAILS;
    } else {
      process.env.APP_ADMIN_EMAILS = originalValue;
    }
  }
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

await runCase("admin workspace routes reject requests without authorization", async () => {
  await withAppAdminEmails("admin@example.com", async () => {
    const app = buildApiApp({
      services: createServices(),
    });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/v1/admin/workspaces",
      });

      assert.equal(response.statusCode, 401);
      assert.equal(response.json().error, "authorization_required");
    } finally {
      await app.close();
    }
  });
});

await runCase("admin workspace routes require an app-admin email", async () => {
  await withAppAdminEmails("other@example.com", async () => {
    let serviceCalled = false;
    const app = buildApiApp({
      services: createServices({
        async listAdminWorkspaces() {
          serviceCalled = true;
          return [];
        },
      }),
    });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/v1/admin/workspaces",
        headers: {
          authorization: "Bearer valid-token",
        },
      });

      assert.equal(response.statusCode, 403);
      assert.equal(response.json().error, "app_admin_required");
      assert.equal(serviceCalled, false);
    } finally {
      await app.close();
    }
  });
});

await runCase("GET /v1/admin/workspaces forwards limit to the admin service", async () => {
  await withAppAdminEmails("admin@example.com", async () => {
    const calls = [];
    const app = buildApiApp({
      services: createServices({
        async listAdminWorkspaces(input) {
          calls.push(input);
          return [
            {
              id: "workspace-1",
              slug: "alpha",
              name: "Alpha",
              kind: "shared",
              createdAt: "2026-06-16T00:00:00.000Z",
            },
          ];
        },
      }),
    });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/v1/admin/workspaces?limit=12",
        headers: {
          authorization: "Bearer valid-token",
        },
      });

      assert.equal(response.statusCode, 200);
      assert.deepEqual(calls, [{ limit: 12 }]);
      assert.equal(response.json().workspaces[0].id, "workspace-1");
    } finally {
      await app.close();
    }
  });
});

await runCase("GET /v1/admin/workspaces/:workspaceId/members forwards to the admin service", async () => {
  await withAppAdminEmails("admin@example.com", async () => {
    const calls = [];
    const app = buildApiApp({
      services: createServices({
        async listAdminWorkspaceMembers(input) {
          calls.push(input);
          return [
            {
              membershipId: "membership-1",
              workspaceId: "workspace-1",
              userId: "member-2",
              role: "member",
              email: "member@example.com",
              displayName: "Member",
            },
          ];
        },
      }),
    });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/v1/admin/workspaces/workspace-1/members",
        headers: {
          authorization: "Bearer valid-token",
        },
      });

      assert.equal(response.statusCode, 200);
      assert.deepEqual(calls, [{ workspaceId: "workspace-1" }]);
      assert.equal(response.json().members[0].userId, "member-2");
    } finally {
      await app.close();
    }
  });
});

await runCase("PATCH /v1/admin/workspaces/:workspaceId/members/:userId forwards role updates", async () => {
  await withAppAdminEmails("admin@example.com", async () => {
    const calls = [];
    const app = buildApiApp({
      services: createServices({
        async updateAdminWorkspaceMemberRole(input) {
          calls.push(input);
          return {
            membershipId: "membership-1",
            workspaceId: "workspace-1",
            userId: "member-2",
            role: "admin",
            email: "member@example.com",
            displayName: "Member",
          };
        },
      }),
    });

    try {
      const response = await app.inject({
        method: "PATCH",
        url: "/v1/admin/workspaces/workspace-1/members/member-2",
        headers: {
          authorization: "Bearer valid-token",
        },
        payload: {
          role: "admin",
        },
      });

      assert.equal(response.statusCode, 200);
      assert.deepEqual(calls, [
        {
          workspaceId: "workspace-1",
          targetUserId: "member-2",
          role: "admin",
        },
      ]);
      assert.equal(response.json().member.role, "admin");
    } finally {
      await app.close();
    }
  });
});

await runCase("PATCH admin member route rejects invalid roles", async () => {
  await withAppAdminEmails("admin@example.com", async () => {
    let serviceCalled = false;
    const app = buildApiApp({
      services: createServices({
        async updateAdminWorkspaceMemberRole() {
          serviceCalled = true;
          return null;
        },
      }),
    });

    try {
      const response = await app.inject({
        method: "PATCH",
        url: "/v1/admin/workspaces/workspace-1/members/member-2",
        headers: {
          authorization: "Bearer valid-token",
        },
        payload: {
          role: "owner",
        },
      });

      assert.equal(response.statusCode, 400);
      assert.equal(response.json().error, "workspace_member_role_invalid");
      assert.equal(serviceCalled, false);
    } finally {
      await app.close();
    }
  });
});

await runCase("PATCH admin member route maps owner-protected service errors", async () => {
  await withAppAdminEmails("admin@example.com", async () => {
    const app = buildApiApp({
      services: createServices({
        async updateAdminWorkspaceMemberRole() {
          const error = new Error("owner protected");
          error.code = "workspace_member_owner_protected";
          throw error;
        },
      }),
    });

    try {
      const response = await app.inject({
        method: "PATCH",
        url: "/v1/admin/workspaces/workspace-1/members/owner-1",
        headers: {
          authorization: "Bearer valid-token",
        },
        payload: {
          role: "admin",
        },
      });

      assert.equal(response.statusCode, 400);
      assert.equal(response.json().error, "workspace_member_owner_protected");
    } finally {
      await app.close();
    }
  });
});

await runCase("admin module-lab routes list, update, and delete roles", async () => {
  await withAppAdminEmails("admin@example.com", async () => {
    const calls = [];
    const app = buildApiApp({
      services: createServices({
        async listAdminWorkspaceModuleRoles(input) {
          calls.push(["list", input]);
          return [
            {
              workspaceId: "workspace-1",
              userId: "member-2",
              moduleId: "module-lab",
              role: "viewer",
            },
          ];
        },
        async updateAdminWorkspaceModuleRole(input) {
          calls.push(["update", input]);
          return {
            workspaceId: "workspace-1",
            userId: "member-2",
            moduleId: "module-lab",
            role: "operator",
          };
        },
        async deleteAdminWorkspaceModuleRole(input) {
          calls.push(["delete", input]);
        },
      }),
    });

    try {
      const listResponse = await app.inject({
        method: "GET",
        url: "/v1/admin/workspaces/workspace-1/module-roles/module-lab",
        headers: {
          authorization: "Bearer valid-token",
        },
      });
      const updateResponse = await app.inject({
        method: "PATCH",
        url: "/v1/admin/workspaces/workspace-1/module-roles/module-lab/member-2",
        headers: {
          authorization: "Bearer valid-token",
        },
        payload: {
          role: "operator",
        },
      });
      const deleteResponse = await app.inject({
        method: "DELETE",
        url: "/v1/admin/workspaces/workspace-1/module-roles/module-lab/member-2",
        headers: {
          authorization: "Bearer valid-token",
        },
      });

      assert.equal(listResponse.statusCode, 200);
      assert.equal(updateResponse.statusCode, 200);
      assert.equal(deleteResponse.statusCode, 200);
      assert.deepEqual(calls, [
        [
          "list",
          {
            workspaceId: "workspace-1",
            moduleId: "module-lab",
          },
        ],
        [
          "update",
          {
            workspaceId: "workspace-1",
            targetUserId: "member-2",
            moduleId: "module-lab",
            role: "operator",
          },
        ],
        [
          "delete",
          {
            workspaceId: "workspace-1",
            targetUserId: "member-2",
            moduleId: "module-lab",
          },
        ],
      ]);
      assert.equal(listResponse.json().moduleRoles[0].role, "viewer");
      assert.equal(updateResponse.json().moduleRole.role, "operator");
      assert.deepEqual(deleteResponse.json(), { ok: true });
    } finally {
      await app.close();
    }
  });
});
