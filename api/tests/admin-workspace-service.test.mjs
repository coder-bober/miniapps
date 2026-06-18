import assert from "node:assert/strict";
import { runCase } from "./helpers/test-helpers.mjs";

import { createApiServices } from "../services/supabase.mjs";

const testConfig = {
  supabaseUrl: "https://example.supabase.co",
  supabaseAnonKey: "anon-key",
  supabaseServiceRoleKey: "service-role-key",
};

function createQuerySequenceClient(steps) {
  let index = 0;

  function nextStep() {
    const step = steps[index];

    if (!step) {
      throw new Error(`Unexpected extra query at step ${index + 1}.`);
    }

    index += 1;
    return step;
  }

  function createBuilder(step) {
    return {
      select(selection) {
        if (step.expectSelect) {
          assert.equal(selection, step.expectSelect);
        }
        return this;
      },
      eq(column, value) {
        if (step.expectEq?.length) {
          const [expected] = step.expectEq;
          assert.deepEqual({ column, value }, expected);
          step.expectEq.shift();
        }
        return this;
      },
      in(column, values) {
        if (step.expectIn) {
          assert.deepEqual({ column, values }, step.expectIn);
        }
        return Promise.resolve(step.result);
      },
      order(column, options) {
        if (step.expectOrder) {
          assert.deepEqual({ column, options }, step.expectOrder);
        }

        if (!step.expectRange) {
          return Promise.resolve(step.result);
        }

        return this;
      },
      range(from, to) {
        if (step.expectRange) {
          assert.deepEqual({ from, to }, step.expectRange);
        }
        return Promise.resolve(step.result);
      },
      maybeSingle() {
        return Promise.resolve(step.result);
      },
      update(payload) {
        if (step.expectUpdate) {
          assert.deepEqual(payload, step.expectUpdate);
        }
        return this;
      },
      upsert(payload, options) {
        if (step.expectUpsert) {
          assert.deepEqual(payload, step.expectUpsert);
        }
        if (step.expectUpsertOptions) {
          assert.deepEqual(options, step.expectUpsertOptions);
        }
        return this;
      },
      delete() {
        if (step.expectDelete) {
          assert.equal(step.expectDelete, true);
        }
        return this;
      },
      single() {
        return Promise.resolve(step.result);
      },
      then(resolve, reject) {
        return Promise.resolve(step.result).then(resolve, reject);
      },
    };
  }

  return {
    from(tableName) {
      const step = nextStep();
      assert.equal(tableName, step.table);
      return createBuilder(step);
    },
    auth: {
      async getUser() {
        return {
          data: {
            user: null,
          },
          error: null,
        };
      },
      admin: {
        async deleteUser() {
          return { error: null };
        },
        async signOut() {
          return { error: null };
        },
        async getUserById(userId) {
          return {
            data: {
              user: {
                email: `${userId}@example.com`,
              },
            },
            error: null,
          };
        },
      },
    },
    get consumedSteps() {
      return index;
    },
    async rpc() {
      throw new Error("Unexpected RPC call.");
    },
  };
}


await runCase("listAdminWorkspaces clamps limit and maps workspace summaries", async () => {
  const adminClient = createQuerySequenceClient([
    {
      table: "workspaces",
      expectSelect: "id, slug, name, kind, created_at",
      expectOrder: {
        column: "created_at",
        options: { ascending: false },
      },
      expectRange: {
        from: 0,
        to: 49,
      },
      result: {
        data: [
          {
            id: "workspace-1",
            slug: "alpha",
            name: "Alpha",
            kind: "shared",
            created_at: "2026-06-16T00:00:00.000Z",
          },
        ],
        error: null,
      },
    },
  ]);

  const services = createApiServices(testConfig, {
    adminClient,
    publicClient: adminClient,
  });

  const workspaces = await services.listAdminWorkspaces({ limit: 200 });

  assert.deepEqual(workspaces, [
    {
      id: "workspace-1",
      slug: "alpha",
      name: "Alpha",
      kind: "shared",
      createdAt: "2026-06-16T00:00:00.000Z",
    },
  ]);
  assert.equal(adminClient.consumedSteps, 1);
});

await runCase("listAdminWorkspaceMembers returns sorted member summaries without actor membership", async () => {
  const adminClient = createQuerySequenceClient([
    {
      table: "workspace_memberships",
      expectSelect: "id, workspace_id, user_id, role, created_at",
      expectEq: [{ column: "workspace_id", value: "workspace-1" }],
      expectOrder: {
        column: "created_at",
        options: { ascending: true },
      },
      result: {
        data: [
          {
            id: "membership-2",
            workspace_id: "workspace-1",
            user_id: "member-2",
            role: "member",
            created_at: "2026-06-16T00:00:01.000Z",
          },
          {
            id: "membership-1",
            workspace_id: "workspace-1",
            user_id: "owner-1",
            role: "owner",
            created_at: "2026-06-16T00:00:02.000Z",
          },
        ],
        error: null,
      },
    },
    {
      table: "profiles",
      expectSelect: "id, username, full_name",
      expectIn: {
        column: "id",
        values: ["member-2", "owner-1"],
      },
      result: {
        data: [
          { id: "owner-1", username: "owner", full_name: "Owner User" },
          { id: "member-2", username: "member", full_name: null },
        ],
        error: null,
      },
    },
  ]);

  const services = createApiServices(testConfig, {
    adminClient,
    publicClient: adminClient,
  });

  const members = await services.listAdminWorkspaceMembers({ workspaceId: "workspace-1" });

  assert.deepEqual(members, [
    {
      membershipId: "membership-1",
      workspaceId: "workspace-1",
      userId: "owner-1",
      role: "owner",
      email: "owner-1@example.com",
      displayName: "Owner User",
    },
    {
      membershipId: "membership-2",
      workspaceId: "workspace-1",
      userId: "member-2",
      role: "member",
      email: "member-2@example.com",
      displayName: "member",
    },
  ]);
  assert.equal(adminClient.consumedSteps, 2);
});

await runCase("updateAdminWorkspaceMemberRole updates an existing non-owner member", async () => {
  const adminClient = createQuerySequenceClient([
    {
      table: "workspace_memberships",
      expectSelect: "id, workspace_id, user_id, role",
      expectEq: [
        { column: "workspace_id", value: "workspace-1" },
        { column: "user_id", value: "member-2" },
      ],
      result: {
        data: {
          id: "membership-2",
          workspace_id: "workspace-1",
          user_id: "member-2",
          role: "member",
        },
        error: null,
      },
    },
    {
      table: "workspace_memberships",
      expectUpdate: { role: "admin" },
      expectEq: [{ column: "id", value: "membership-2" }],
      result: { data: null, error: null },
    },
    {
      table: "workspace_memberships",
      expectSelect: "id, workspace_id, user_id, role, created_at",
      expectEq: [{ column: "workspace_id", value: "workspace-1" }],
      expectOrder: {
        column: "created_at",
        options: { ascending: true },
      },
      result: {
        data: [
          {
            id: "membership-2",
            workspace_id: "workspace-1",
            user_id: "member-2",
            role: "admin",
            created_at: "2026-06-16T00:00:00.000Z",
          },
        ],
        error: null,
      },
    },
    {
      table: "profiles",
      expectSelect: "id, username, full_name",
      expectIn: {
        column: "id",
        values: ["member-2"],
      },
      result: {
        data: [{ id: "member-2", username: "member", full_name: null }],
        error: null,
      },
    },
  ]);

  const services = createApiServices(testConfig, {
    adminClient,
    publicClient: adminClient,
  });

  const member = await services.updateAdminWorkspaceMemberRole({
    workspaceId: "workspace-1",
    targetUserId: "member-2",
    role: "admin",
  });

  assert.equal(member.userId, "member-2");
  assert.equal(member.role, "admin");
  assert.equal(adminClient.consumedSteps, 4);
});

await runCase("updateAdminWorkspaceMemberRole rejects owner role updates", async () => {
  const adminClient = createQuerySequenceClient([]);
  const services = createApiServices(testConfig, {
    adminClient,
    publicClient: adminClient,
  });

  await assert.rejects(
    () =>
      services.updateAdminWorkspaceMemberRole({
        workspaceId: "workspace-1",
        targetUserId: "member-2",
        role: "owner",
      }),
    { code: "workspace_member_role_invalid" },
  );
  assert.equal(adminClient.consumedSteps, 0);
});

await runCase("updateAdminWorkspaceMemberRole protects existing workspace owners", async () => {
  const adminClient = createQuerySequenceClient([
    {
      table: "workspace_memberships",
      expectSelect: "id, workspace_id, user_id, role",
      expectEq: [
        { column: "workspace_id", value: "workspace-1" },
        { column: "user_id", value: "owner-1" },
      ],
      result: {
        data: {
          id: "membership-1",
          workspace_id: "workspace-1",
          user_id: "owner-1",
          role: "owner",
        },
        error: null,
      },
    },
  ]);
  const services = createApiServices(testConfig, {
    adminClient,
    publicClient: adminClient,
  });

  await assert.rejects(
    () =>
      services.updateAdminWorkspaceMemberRole({
        workspaceId: "workspace-1",
        targetUserId: "owner-1",
        role: "admin",
      }),
    { code: "workspace_member_owner_protected" },
  );
  assert.equal(adminClient.consumedSteps, 1);
});

await runCase("listAdminWorkspaceModuleRoles lists module-lab role rows", async () => {
  const adminClient = createQuerySequenceClient([
    {
      table: "workspace_module_roles",
      expectSelect: "workspace_id, user_id, module_id, role",
      expectEq: [
        { column: "workspace_id", value: "workspace-1" },
        { column: "module_id", value: "module-lab" },
      ],
      result: {
        data: [
          {
            workspace_id: "workspace-1",
            user_id: "member-2",
            module_id: "module-lab",
            role: "operator",
          },
        ],
        error: null,
      },
    },
  ]);
  const services = createApiServices(testConfig, {
    adminClient,
    publicClient: adminClient,
  });

  const roles = await services.listAdminWorkspaceModuleRoles({
    workspaceId: "workspace-1",
    moduleId: "module-lab",
  });

  assert.deepEqual(roles, [
    {
      workspaceId: "workspace-1",
      userId: "member-2",
      moduleId: "module-lab",
      role: "operator",
    },
  ]);
  assert.equal(adminClient.consumedSteps, 1);
});

await runCase("updateAdminWorkspaceModuleRole upserts module-lab roles for existing members", async () => {
  const adminClient = createQuerySequenceClient([
    {
      table: "workspace_memberships",
      expectSelect: "id, workspace_id, user_id, role",
      expectEq: [
        { column: "workspace_id", value: "workspace-1" },
        { column: "user_id", value: "member-2" },
      ],
      result: {
        data: {
          id: "membership-2",
          workspace_id: "workspace-1",
          user_id: "member-2",
          role: "member",
        },
        error: null,
      },
    },
    {
      table: "workspace_module_roles",
      expectUpsert: {
        workspace_id: "workspace-1",
        user_id: "member-2",
        module_id: "module-lab",
        role: "viewer",
      },
      expectUpsertOptions: { onConflict: "workspace_id,user_id,module_id" },
      expectSelect: "workspace_id, user_id, module_id, role",
      result: {
        data: {
          workspace_id: "workspace-1",
          user_id: "member-2",
          module_id: "module-lab",
          role: "viewer",
        },
        error: null,
      },
    },
  ]);
  const services = createApiServices(testConfig, {
    adminClient,
    publicClient: adminClient,
  });

  const role = await services.updateAdminWorkspaceModuleRole({
    workspaceId: "workspace-1",
    targetUserId: "member-2",
    moduleId: "module-lab",
    role: "viewer",
  });

  assert.deepEqual(role, {
    workspaceId: "workspace-1",
    userId: "member-2",
    moduleId: "module-lab",
    role: "viewer",
  });
  assert.equal(adminClient.consumedSteps, 2);
});

await runCase("updateAdminWorkspaceModuleRole rejects unsupported module roles before querying", async () => {
  const adminClient = createQuerySequenceClient([]);
  const services = createApiServices(testConfig, {
    adminClient,
    publicClient: adminClient,
  });

  await assert.rejects(
    () =>
      services.updateAdminWorkspaceModuleRole({
        workspaceId: "workspace-1",
        targetUserId: "member-2",
        moduleId: "module-lab",
        role: "owner",
      }),
    { code: "workspace_module_role_invalid" },
  );
  assert.equal(adminClient.consumedSteps, 0);
});

await runCase("deleteAdminWorkspaceModuleRole removes module-lab role rows for existing members", async () => {
  const adminClient = createQuerySequenceClient([
    {
      table: "workspace_memberships",
      expectSelect: "id, workspace_id, user_id, role",
      expectEq: [
        { column: "workspace_id", value: "workspace-1" },
        { column: "user_id", value: "member-2" },
      ],
      result: {
        data: {
          id: "membership-2",
          workspace_id: "workspace-1",
          user_id: "member-2",
          role: "member",
        },
        error: null,
      },
    },
    {
      table: "workspace_module_roles",
      expectDelete: true,
      expectEq: [
        { column: "workspace_id", value: "workspace-1" },
        { column: "user_id", value: "member-2" },
        { column: "module_id", value: "module-lab" },
      ],
      result: { data: null, error: null },
    },
  ]);
  const services = createApiServices(testConfig, {
    adminClient,
    publicClient: adminClient,
  });

  await services.deleteAdminWorkspaceModuleRole({
    workspaceId: "workspace-1",
    targetUserId: "member-2",
    moduleId: "module-lab",
  });

  assert.equal(adminClient.consumedSteps, 2);
});
