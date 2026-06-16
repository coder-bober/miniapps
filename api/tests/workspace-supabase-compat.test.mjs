import assert from "node:assert/strict";

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
      order(column, options) {
        if (step.expectOrder) {
          assert.deepEqual({ column, options }, step.expectOrder);
        }
        return Promise.resolve(step.result);
      },
      maybeSingle() {
        return Promise.resolve(step.result);
      },
      insert(payload) {
        if (step.expectInsert) {
          assert.deepEqual(payload, step.expectInsert);
        }
        return {
          select(selection) {
            if (step.expectSelect) {
              assert.equal(selection, step.expectSelect);
            }
            return {
              single() {
                return Promise.resolve(step.result);
              },
            };
          },
        };
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

async function runCase(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

await runCase("strict ownership transfer uses transactional RPC", async () => {
  let rpcCall = null;
  const adminClient = {
    auth: {
      async getUser() {
        return { data: { user: null }, error: null };
      },
      admin: {},
    },
    async rpc(name, payload) {
      rpcCall = { name, payload };
      return { data: null, error: null };
    },
    from() {
      throw new Error("Ownership transfer should not use table upsert.");
    },
  };

  const services = createApiServices({
    ...testConfig,
  }, {
    adminClient,
    publicClient: adminClient,
  });

  await services.transferWorkspaceOwnership({
    workspaceId: "workspace-1",
    actorUserId: "owner-1",
    newOwnerUserId: "member-2",
  });

  assert.deepEqual(rpcCall, {
    name: "transfer_workspace_ownership",
    payload: {
      p_workspace_id: "workspace-1",
      p_actor_user_id: "owner-1",
      p_new_owner_user_id: "member-2",
    },
  });
});

await runCase("resolveWorkspaceContext returns the personal workspace when workspaces exist", async () => {
  const adminClient = createQuerySequenceClient([
    {
      table: "workspaces",
      expectSelect: "id, slug",
      expectEq: [
        { column: "kind", value: "personal" },
        { column: "personal_owner_user_id", value: "user-123" },
      ],
      result: {
        data: {
          id: "workspace-1",
          slug: "user-user123",
        },
        error: null,
      },
    },
  ]);

  const services = createApiServices(testConfig, {
    adminClient,
    publicClient: adminClient,
  });

  const context = await services.resolveWorkspaceContext({
    userId: "user-123",
    workspaceSlug: "default",
  });

  assert.deepEqual(context, {
    workspaceId: "workspace-1",
    workspaceSlug: "default",
  });
  assert.equal(adminClient.consumedSteps, 1);
});

await runCase("getUserWorkspaceModuleRole reads a workspace-scoped module role by composite identity", async () => {
  const adminClient = createQuerySequenceClient([
    {
      table: "workspace_module_roles",
      expectSelect: "role",
      expectEq: [
        { column: "workspace_id", value: "workspace-1" },
        { column: "user_id", value: "user-123" },
        { column: "module_id", value: "module-lab" },
      ],
      result: {
        data: {
          role: "operator",
        },
        error: null,
      },
    },
  ]);

  const services = createApiServices(testConfig, {
    adminClient,
    publicClient: adminClient,
  });

  const role = await services.getUserWorkspaceModuleRole({
    workspaceId: "workspace-1",
    userId: "user-123",
    moduleId: "module-lab",
  });

  assert.equal(role, "operator");
  assert.equal(adminClient.consumedSteps, 1);
});

await runCase("getUserWorkspaceModuleRole returns null when no workspace module role exists", async () => {
  const adminClient = createQuerySequenceClient([
    {
      table: "workspace_module_roles",
      expectSelect: "role",
      expectEq: [
        { column: "workspace_id", value: "workspace-1" },
        { column: "user_id", value: "user-123" },
        { column: "module_id", value: "module-lab" },
      ],
      result: {
        data: null,
        error: null,
      },
    },
  ]);

  const services = createApiServices(testConfig, {
    adminClient,
    publicClient: adminClient,
  });

  const role = await services.getUserWorkspaceModuleRole({
    workspaceId: "workspace-1",
    userId: "user-123",
    moduleId: "module-lab",
  });

  assert.equal(role, null);
  assert.equal(adminClient.consumedSteps, 1);
});

await runCase("listWorkspaceFiles uses workspace_id as the access boundary when present", async () => {
  const adminClient = createQuerySequenceClient([
    {
      table: "workspace_files",
      expectSelect:
        "id, workspace_id, workspace_slug, original_name, stored_name, mime_type, size_bytes, kind, created_at, thumbnail_status, thumbnail_error, thumbnail_storage_key, thumbnail_mime_type, thumbnail_width, thumbnail_height, thumbnail_created_at",
      expectEq: [
        { column: "workspace_id", value: "workspace-1" },
      ],
      expectOrder: {
        column: "created_at",
        options: { ascending: false },
      },
      result: {
        data: [],
        error: null,
      },
    },
  ]);

  const services = createApiServices(testConfig, {
    adminClient,
    publicClient: adminClient,
  });

  const files = await services.listWorkspaceFiles({
    userId: "user-123",
    workspaceId: "workspace-1",
    workspaceSlug: "default",
  });

  assert.deepEqual(files, []);
  assert.equal(adminClient.consumedSteps, 1);
});


await runCase("createWorkspaceFile writes workspace_id directly", async () => {
  const adminClient = createQuerySequenceClient([
    {
      table: "workspace_files",
      expectInsert: {
        user_id: "user-123",
        workspace_id: "workspace-1",
        workspace_slug: "default",
        storage_bucket: "workspace-files",
        storage_key: "workspace/user-123/default/file.txt",
        original_name: "file.txt",
        stored_name: "stored-file.txt",
        mime_type: "text/plain",
        size_bytes: 4,
        kind: "document",
        thumbnail_status: "pending",
        thumbnail_error: null,
      },
      expectSelect:
        "id, workspace_id, workspace_slug, original_name, stored_name, mime_type, size_bytes, kind, created_at, thumbnail_status, thumbnail_error, thumbnail_storage_key, thumbnail_mime_type, thumbnail_width, thumbnail_height, thumbnail_created_at",
      result: {
        data: {
          id: "file-1",
          workspace_id: "workspace-1",
          workspace_slug: "default",
          original_name: "file.txt",
          stored_name: "stored-file.txt",
          mime_type: "text/plain",
          size_bytes: 4,
          kind: "document",
          created_at: "2026-03-30T00:00:00.000Z",
          thumbnail_status: "pending",
          thumbnail_error: null,
          thumbnail_storage_key: null,
          thumbnail_mime_type: null,
          thumbnail_width: null,
          thumbnail_height: null,
          thumbnail_created_at: null,
        },
        error: null,
      },
    },
  ]);

  const services = createApiServices(testConfig, {
    adminClient,
    publicClient: adminClient,
  });

  const createdFile = await services.createWorkspaceFile({
    userId: "user-123",
    workspaceId: "workspace-1",
    workspaceSlug: "default",
    storageBucket: "workspace-files",
    storageKey: "workspace/user-123/default/file.txt",
    originalName: "file.txt",
    storedName: "stored-file.txt",
    mimeType: "text/plain",
    sizeBytes: 4,
    kind: "document",
    thumbnailStatus: "pending",
    thumbnailError: null,
  });

  assert.equal(createdFile.id, "file-1");
  assert.equal(createdFile.workspaceId, "workspace-1");
  assert.equal(createdFile.workspaceSlug, "default");
  assert.equal(adminClient.consumedSteps, 1);
});

await runCase("findWorkspaceFile requires workspace_id access boundary", async () => {
  const adminClient = createQuerySequenceClient([
    {
      table: "workspace_files",
      expectSelect:
        "id, workspace_id, workspace_slug, storage_bucket, storage_key, thumbnail_storage_key, thumbnail_mime_type, thumbnail_status, thumbnail_error",
      expectEq: [
        { column: "id", value: "file-1" },
        { column: "workspace_id", value: "workspace-1" },
      ],
      result: {
        data: {
          id: "file-1",
          workspace_id: "workspace-1",
          workspace_slug: "default",
          storage_bucket: "workspace-files",
          storage_key: "workspace/user-123/default/file.txt",
          thumbnail_storage_key: "workspace/user-123/default/file.txt.thumb.webp",
          thumbnail_mime_type: "image/webp",
          thumbnail_status: "completed",
          thumbnail_error: null,
        },
        error: null,
      },
    },
  ]);

  const services = createApiServices(testConfig, {
    adminClient,
    publicClient: adminClient,
  });

  const file = await services.findWorkspaceFile({
    workspaceId: "workspace-1",
    fileId: "file-1",
  });

  assert.deepEqual(file, {
    id: "file-1",
    workspaceId: "workspace-1",
    workspaceSlug: "default",
    storageBucket: "workspace-files",
    storageKey: "workspace/user-123/default/file.txt",
    thumbnailStorageKey: "workspace/user-123/default/file.txt.thumb.webp",
    thumbnailMimeType: "image/webp",
    thumbnailStatus: "completed",
    thumbnailError: null,
  });
  assert.equal(adminClient.consumedSteps, 1);
});

await runCase("getWorkspaceFileForThumbnail reads workspace_id directly", async () => {
  const adminClient = createQuerySequenceClient([
    {
      table: "workspace_files",
      expectSelect:
        "id, user_id, workspace_id, workspace_slug, storage_bucket, storage_key, mime_type, kind",
      expectEq: [{ column: "id", value: "file-1" }],
      result: {
        data: {
          id: "file-1",
          user_id: "user-123",
          workspace_id: "workspace-1",
          workspace_slug: "default",
          storage_bucket: "workspace-files",
          storage_key: "workspace/user-123/default/file.txt",
          mime_type: "text/plain",
          kind: "document",
        },
        error: null,
      },
    },
  ]);

  const services = createApiServices(testConfig, {
    adminClient,
    publicClient: adminClient,
  });

  const file = await services.getWorkspaceFileForThumbnail("file-1");

  assert.deepEqual(file, {
    id: "file-1",
    userId: "user-123",
    workspaceId: "workspace-1",
    workspaceSlug: "default",
    storageBucket: "workspace-files",
    storageKey: "workspace/user-123/default/file.txt",
    mimeType: "text/plain",
    kind: "document",
  });
  assert.equal(adminClient.consumedSteps, 1);
});
