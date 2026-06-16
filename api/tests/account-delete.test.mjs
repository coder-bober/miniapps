import assert from "node:assert/strict";

import { buildApiApp } from "../app.mjs";
import { createQueueService } from "../core/queue/service.mjs";

function createServices(overrides = {}) {
  return {
    async verifyAccessToken() {
      return {
        id: "user-123",
        email: "owner@example.com",
      };
    },
    async deleteAccount() {},
    async signOutEverywhere() {},
    async getUserModuleRole() {
      return "operator";
    },
    async getWorkspaceMembershipRole() {
      return "owner";
    },
    async getPersonalWorkspace() {
      return {
        workspaceId: "workspace-1",
        id: "workspace-1",
        slug: "default",
      };
    },
    async listUserWorkspaces() {
      return [
        {
          id: null,
          slug: "default",
          name: "Personal workspace",
          kind: "personal",
          membershipRole: "owner",
        },
      ];
    },
    async createSharedWorkspace() {
      return {
        id: "workspace-created",
        slug: "team-created",
        name: "Team Created",
        kind: "shared",
        membershipRole: "owner",
      };
    },
    async listWorkspaceFiles() {
      return [];
    },
    async createWorkspaceFile() {
      return {
        id: "file-1",
        workspaceSlug: "default",
        originalName: "file.txt",
        storedName: "stored-file.txt",
        mimeType: "text/plain",
        sizeBytes: 4,
        kind: "document",
        createdAt: "2026-03-12T00:00:00.000Z",
        thumbnailStatus: "pending",
        thumbnailError: null,
        thumbnail: null,
      };
    },
    async enqueueModuleJob() {},
    async findWorkspaceFile() {
      return null;
    },
    async deleteWorkspaceFile() {},
    getBucketName() {
      return "workspace-files";
    },
    buildWorkspaceObjectKey() {
      return "workspace/user-123/default/file.txt";
    },
    async uploadWorkspaceFileObject() {},
    async deleteWorkspaceFileObject() {},
    async resolveWorkspaceContext({ workspaceSlug }) {
      return {
        workspaceId: "workspace-1",
        workspaceSlug,
      };
    },
    ...overrides,
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

await runCase("GET /health returns ok", async () => {
  const app = buildApiApp({
    services: createServices(),
  });

  try {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { ok: true });
  } finally {
    await app.close();
  }
});

await runCase("POST /v1/account/delete rejects requests without authorization", async () => {
  const app = buildApiApp({
    services: createServices(),
  });

  try {
    const response = await app.inject({
      method: "POST",
      url: "/v1/account/delete",
      payload: {
        confirmation: "owner@example.com",
      },
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error, "authorization_required");
  } finally {
    await app.close();
  }
});

await runCase("POST /v1/account/delete rejects wrong confirmation email", async () => {
  let deleteCalled = false;

  const app = buildApiApp({
    services: createServices({
      async deleteAccount() {
        deleteCalled = true;
      },
    }),
  });

  try {
    const response = await app.inject({
      method: "POST",
      url: "/v1/account/delete",
      headers: {
        authorization: "Bearer valid-token",
      },
      payload: {
        confirmation: "wrong@example.com",
      },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error, "confirmation_mismatch");
    assert.equal(deleteCalled, false);
  } finally {
    await app.close();
  }
});

await runCase("POST /v1/account/delete deletes the verified account on exact confirmation", async () => {
  const deletedUserIds = [];

  const app = buildApiApp({
    services: createServices({
      async deleteAccount(userId) {
        deletedUserIds.push(userId);
      },
    }),
  });

  try {
    const response = await app.inject({
      method: "POST",
      url: "/v1/account/delete",
      headers: {
        authorization: "Bearer valid-token",
      },
      payload: {
        confirmation: "owner@example.com",
      },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { ok: true });
    assert.deepEqual(deletedUserIds, ["user-123"]);
  } finally {
    await app.close();
  }
});

await runCase("POST /v1/account/sign-out-everywhere rejects requests without authorization", async () => {
  const app = buildApiApp({
    services: createServices(),
  });

  try {
    const response = await app.inject({
      method: "POST",
      url: "/v1/account/sign-out-everywhere",
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error, "authorization_required");
  } finally {
    await app.close();
  }
});

await runCase("POST /v1/account/sign-out-everywhere revokes sessions for the verified account", async () => {
  const revokedTokens = [];

  const app = buildApiApp({
    services: createServices({
      async signOutEverywhere(accessToken) {
        revokedTokens.push(accessToken);
      },
    }),
  });

  try {
    const response = await app.inject({
      method: "POST",
      url: "/v1/account/sign-out-everywhere",
      headers: {
        authorization: "Bearer valid-token",
      },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { ok: true });
    assert.deepEqual(revokedTokens, ["valid-token"]);
  } finally {
    await app.close();
  }
});

await runCase("GET /v1/workspace/files rejects requests without authorization", async () => {
  const app = buildApiApp({
    services: createServices(),
  });

  try {
    const response = await app.inject({
      method: "GET",
      url: "/v1/workspace/files",
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error, "authorization_required");
  } finally {
    await app.close();
  }
});

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

await runCase("GET /v1/workspace/files returns files for the verified account", async () => {
  const app = buildApiApp({
    services: createServices({
      async listWorkspaceFiles({ userId, workspaceSlug }) {
        assert.equal(userId, "user-123");
        assert.equal(workspaceSlug, "default");

        return [
          {
            id: "file-1",
            workspaceSlug: "default",
            originalName: "report.txt",
            storedName: "1710000000-report.txt",
            mimeType: "text/plain",
            sizeBytes: 128,
            kind: "document",
            createdAt: "2026-03-12T00:00:00.000Z",
          },
        ];
      },
    }),
  });

  try {
    const response = await app.inject({
      method: "GET",
      url: "/v1/workspace/files",
      headers: {
        authorization: "Bearer valid-token",
      },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().files.length, 1);
  } finally {
    await app.close();
  }
});

await runCase("GET /v1/workspace/files rejects access when a resolved workspace has no membership", async () => {
  const app = buildApiApp({
    services: createServices({
      async getPersonalWorkspace() {
        return {
          workspaceId: "workspace-1",
          id: "workspace-1",
          slug: "user-user123",
        };
      },
      async getWorkspaceMembershipRole() {
        return null;
      },
    }),
  });

  try {
    const response = await app.inject({
      method: "GET",
      url: "/v1/workspace/files",
      headers: {
        authorization: "Bearer valid-token",
      },
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error, "module_capability_required");
    assert.equal(response.json().requiredCapability, "workspace-files.read");
  } finally {
    await app.close();
  }
});

await runCase("POST /v1/workspace/files uploads a supported file for the verified account", async () => {
  const uploadedObjects = [];
  const createdFiles = [];
  const queuedJobs = [];
  const boundary = "----workspace-upload-boundary";
  const body = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="workspaceSlug"',
    "",
    "default",
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="notes.txt"',
    "Content-Type: text/plain",
    "",
    "hello workspace",
    `--${boundary}--`,
    "",
  ].join("\r\n");

  const app = buildApiApp({
    services: createServices({
      async uploadWorkspaceFileObject(payload) {
        uploadedObjects.push(payload);
      },
      async createWorkspaceFile(payload) {
        createdFiles.push(payload);

        return {
          id: "file-1",
          workspaceSlug: payload.workspaceSlug,
          originalName: payload.originalName,
          storedName: payload.storedName,
          mimeType: payload.mimeType,
          sizeBytes: payload.sizeBytes,
          kind: payload.kind,
          createdAt: "2026-03-12T00:00:00.000Z",
          thumbnailStatus: payload.thumbnailStatus,
          thumbnailError: payload.thumbnailError,
          thumbnail: null,
        };
      },
      async enqueueModuleJob(jobId, payload) {
        queuedJobs.push({ jobId, payload });
      },
    }),
  });

  try {
    const response = await app.inject({
      method: "POST",
      url: "/v1/workspace/files",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    assert.equal(response.statusCode, 201);
    assert.equal(uploadedObjects.length, 1);
    assert.equal(createdFiles.length, 1);
    assert.equal(queuedJobs.length, 1);
    assert.equal(queuedJobs[0].jobId, "workspace-files.generate-thumbnail");
    assert.equal(queuedJobs[0].payload.fileId, "file-1");
    assert.equal(response.json().file.originalName, "notes.txt");
    assert.equal(response.json().file.thumbnailStatus, "pending");
  } finally {
    await app.close();
  }
});

await runCase("POST /v1/workspace/files rejects upload when workspace capability is missing", async () => {
  const boundary = "----workspace-upload-boundary-no-upload";
  const body = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="workspaceSlug"',
    "",
    "default",
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="notes.txt"',
    "Content-Type: text/plain",
    "",
    "hello workspace",
    `--${boundary}--`,
    "",
  ].join("\r\n");

  const app = buildApiApp({
    services: createServices({
      async getPersonalWorkspace() {
        return {
          id: "workspace-1",
          slug: "user-user123",
        };
      },
      async getWorkspaceMembershipRole() {
        return null;
      },
      async getUserWorkspaceModuleRole() {
        return null;
      },
    }),
  });

  try {
    const response = await app.inject({
      method: "POST",
      url: "/v1/workspace/files",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error, "module_capability_required");
    assert.equal(response.json().requiredCapability, "workspace-files.upload");
  } finally {
    await app.close();
  }
});

await runCase("POST /v1/workspace/files rejects files whose bytes do not match the declared MIME type", async () => {
  const boundary = "----workspace-upload-boundary-mismatch";
  const pngBytes = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  const body = Buffer.concat([
    Buffer.from(
      [
        `--${boundary}`,
        'Content-Disposition: form-data; name="workspaceSlug"',
        "",
        "default",
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="fake.txt"',
        "Content-Type: text/plain",
        "",
      ].join("\r\n") + "\r\n",
    ),
    pngBytes,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const app = buildApiApp({
    services: createServices(),
  });

  try {
    const response = await app.inject({
      method: "POST",
      url: "/v1/workspace/files",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    assert.equal(response.statusCode, 415);
    assert.equal(response.json().error, "unsupported_file_type");
  } finally {
    await app.close();
  }
});

await runCase("POST /v1/workspace/files rejects unsupported binary files", async () => {
  const boundary = "----workspace-upload-boundary-binary";
  const binaryBytes = Buffer.from([0x00, 0xff, 0x10, 0x80, 0x42]);
  const body = Buffer.concat([
    Buffer.from(
      [
        `--${boundary}`,
        'Content-Disposition: form-data; name="workspaceSlug"',
        "",
        "default",
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="blob.bin"',
        "Content-Type: application/octet-stream",
        "",
      ].join("\r\n") + "\r\n",
    ),
    binaryBytes,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const app = buildApiApp({
    services: createServices(),
  });

  try {
    const response = await app.inject({
      method: "POST",
      url: "/v1/workspace/files",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    assert.equal(response.statusCode, 415);
    assert.equal(response.json().error, "unsupported_file_type");
  } finally {
    await app.close();
  }
});

await runCase("POST /v1/workspace/files maps unreachable storage errors clearly", async () => {
  const boundary = "----workspace-upload-boundary-storage-down";
  const body = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="workspaceSlug"',
    "",
    "default",
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="notes.txt"',
    "Content-Type: text/plain",
    "",
    "hello workspace",
    `--${boundary}--`,
    "",
  ].join("\r\n");

  const app = buildApiApp({
    services: createServices({
      async uploadWorkspaceFileObject() {
        const error = new Error("connect ECONNREFUSED 127.0.0.1:8333");
        error.code = "ECONNREFUSED";
        throw error;
      },
    }),
  });

  try {
    const response = await app.inject({
      method: "POST",
      url: "/v1/workspace/files",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    assert.equal(response.statusCode, 503);
    assert.equal(response.json().error, "workspace_storage_unreachable");
  } finally {
    await app.close();
  }
});

await runCase("GET /v1/workspace/files/:id/thumbnail maps storage auth failures clearly", async () => {
  const app = buildApiApp({
    services: createServices({
      async findWorkspaceFile() {
        return {
          id: "file-1",
          storageBucket: "workspace-files",
          storageKey: "workspace/user-123/default/notes.txt",
          thumbnailStorageKey: "workspace/user-123/default/notes.txt.thumbnail.webp",
          thumbnailMimeType: "image/webp",
        };
      },
      async downloadWorkspaceFileObject() {
        const error = new Error("Access denied");
        error.name = "AccessDenied";
        error.$metadata = {
          httpStatusCode: 403,
        };
        throw error;
      },
    }),
  });

  try {
    const response = await app.inject({
      method: "GET",
      url: "/v1/workspace/files/file-1/thumbnail",
      headers: {
        authorization: "Bearer valid-token",
      },
    });

    assert.equal(response.statusCode, 502);
    assert.equal(response.json().error, "workspace_storage_auth_failed");
  } finally {
    await app.close();
  }
});

await runCase("DELETE /v1/workspace/files/:id removes the stored object and metadata", async () => {
  const deletedObjects = [];
  const deletedFiles = [];

  const app = buildApiApp({
    services: createServices({
      async findWorkspaceFile() {
        return {
          id: "file-1",
          storageBucket: "workspace-files",
          storageKey: "workspace/user-123/default/notes.txt",
          thumbnailStorageKey: "workspace/user-123/default/notes.txt.thumbnail.webp",
        };
      },
      async deleteWorkspaceFileObject(payload) {
        deletedObjects.push(payload);
      },
      async deleteWorkspaceFile(payload) {
        deletedFiles.push(payload);
      },
    }),
  });

  try {
    const response = await app.inject({
      method: "DELETE",
      url: "/v1/workspace/files/file-1",
      headers: {
        authorization: "Bearer valid-token",
      },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { ok: true });
    assert.equal(deletedObjects.length, 2);
    assert.deepEqual(deletedObjects.map((item) => item.storageKey), [
      "workspace/user-123/default/notes.txt",
      "workspace/user-123/default/notes.txt.thumbnail.webp",
    ]);
    assert.equal(deletedFiles.length, 1);
  } finally {
    await app.close();
  }
});

await runCase("queue service exposes normalized module job runtime options", async () => {
  const queue = createQueueService();
  const registeredJob = queue.getRegisteredJob("workspace-files.generate-thumbnail");

  assert.ok(registeredJob);
  assert.equal(registeredJob.queue, "thumbnails");
  assert.equal(registeredJob.attempts, 3);
  assert.equal(registeredJob.backoffMs, 1000);
  assert.equal(registeredJob.removeOnComplete, 100);
  assert.equal(registeredJob.removeOnFail, false);

  const queuedJob = await queue.enqueueModuleJob("workspace-files.generate-thumbnail", {
    fileId: "file-1",
  });

  assert.equal(queuedJob.queue, "thumbnails");
  assert.equal(queuedJob.attempts, 3);
  assert.equal(queuedJob.backoffMs, 1000);
  assert.equal(queuedJob.removeOnComplete, 100);
  assert.equal(queuedJob.removeOnFail, false);
});
