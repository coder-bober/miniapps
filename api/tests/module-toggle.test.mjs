import assert from "node:assert/strict";

import { buildApiApp } from "../app.mjs";
import { createQueueService } from "../core/queue/service.mjs";
import { getApiModuleById, getApiModuleJobs } from "../modules/registry.mjs";
import {
  getEnabledModuleIds,
  isModuleEnabled,
} from "../../src/shared/modules/enabled-modules.mjs";

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
    async getWorkspaceMembershipRole() {
      return "member";
    },
    async getUserWorkspaceModuleRole() {
      return "operator";
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

async function withEnabledModules(value, fn) {
  const hadValue = Object.prototype.hasOwnProperty.call(process.env, "ENABLED_MODULES");
  const originalValue = process.env.ENABLED_MODULES;

  try {
    if (value === undefined) {
      delete process.env.ENABLED_MODULES;
    } else {
      process.env.ENABLED_MODULES = value;
    }

    await fn();
  } finally {
    if (hadValue) {
      process.env.ENABLED_MODULES = originalValue;
    } else {
      delete process.env.ENABLED_MODULES;
    }
  }
}

await runCase("unset ENABLED_MODULES enables all modules by default", async () => {
  await withEnabledModules(undefined, async () => {
    assert.equal(getEnabledModuleIds(), null);
    assert.equal(isModuleEnabled("workspace-files"), true);
    assert.equal(isModuleEnabled("module-lab"), true);
    assert.ok(getApiModuleById("workspace-files"));
    assert.ok(getApiModuleById("module-lab"));
    assert.equal(getApiModuleJobs().length, 2);
  });
});

await runCase("empty ENABLED_MODULES disables all modules", async () => {
  await withEnabledModules("", async () => {
    assert.deepEqual(getEnabledModuleIds(), []);
    assert.equal(isModuleEnabled("workspace-files"), false);
    assert.equal(getApiModuleById("workspace-files"), null);
    assert.deepEqual(getApiModuleJobs(), []);

    const queueService = createQueueService();
    assert.equal(queueService.getRegisteredJob("workspace-files.generate-thumbnail"), null);
  });
});

await runCase("comma-separated ENABLED_MODULES acts as an allowlist", async () => {
  await withEnabledModules("workspace-files,other-module", async () => {
    assert.deepEqual(getEnabledModuleIds(), ["workspace-files", "other-module"]);
    assert.equal(isModuleEnabled("workspace-files"), true);
    assert.equal(isModuleEnabled("missing-module"), false);
    assert.ok(getApiModuleById("workspace-files"));
  });
});

await runCase("workspace file backend routes are absent when the module is disabled", async () => {
  await withEnabledModules("", async () => {
    const app = buildApiApp({
      services: createServices(),
    });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/v1/workspace/files",
      });

      assert.equal(response.statusCode, 404);
    } finally {
      await app.close();
    }
  });
});

await runCase("workspace file backend routes are registered when the module is enabled", async () => {
  await withEnabledModules("workspace-files", async () => {
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
});

await runCase("module-lab backend route and job are available for workspace module operator", async () => {
  const queuedJobs = [];

  await withEnabledModules("module-lab", async () => {
    const app = buildApiApp({
      services: createServices({
        async enqueueModuleJob(jobId, payload) {
          queuedJobs.push({ jobId, payload });
          return {
            jobId,
            queue: "module-lab",
            queuedAt: "2026-03-16T00:00:00.000Z",
            provider: null,
            providerJobId: null,
          };
        },
      }),
    });

    try {
      const statusResponse = await app.inject({
        method: "GET",
        url: "/v1/module-lab?workspaceId=workspace-1",
        headers: {
          authorization: "Bearer valid-token",
        },
      });

      assert.equal(statusResponse.statusCode, 200);
      assert.equal(statusResponse.json().module.id, "module-lab");
      assert.equal(statusResponse.json().role, "operator");
      assert.deepEqual(statusResponse.json().capabilities, [
        "module-lab.read",
        "module-lab.run_job",
      ]);
      assert.equal(statusResponse.json().jobs.length, 1);
      assert.equal(statusResponse.json().jobs[0].id, "module-lab.echo");

      const runResponse = await app.inject({
        method: "POST",
        url: "/v1/module-lab/job?workspaceId=workspace-1",
        headers: {
          authorization: "Bearer valid-token",
          "content-type": "application/json",
        },
        payload: {
          message: "hello from module-lab",
        },
      });

      assert.equal(runResponse.statusCode, 200);
      assert.equal(runResponse.json().ok, true);
      assert.equal(queuedJobs.length, 1);
      assert.equal(queuedJobs[0].jobId, "module-lab.echo");
      assert.equal(queuedJobs[0].payload.message, "hello from module-lab");
    } finally {
      await app.close();
    }
  });
});

await runCase("module-lab workspace read access allows status but blocks job execution for viewer", async () => {
  await withEnabledModules("module-lab", async () => {
    const app = buildApiApp({
      services: createServices({
        async getUserWorkspaceModuleRole() {
          return "viewer";
        },
      }),
    });

    try {
      const statusResponse = await app.inject({
        method: "GET",
        url: "/v1/module-lab?workspaceId=workspace-1",
        headers: {
          authorization: "Bearer valid-token",
        },
      });

      assert.equal(statusResponse.statusCode, 200);
      assert.equal(statusResponse.json().role, "viewer");
      assert.deepEqual(statusResponse.json().capabilities, ["module-lab.read"]);

      const runResponse = await app.inject({
        method: "POST",
        url: "/v1/module-lab/job?workspaceId=workspace-1",
        headers: {
          authorization: "Bearer valid-token",
          "content-type": "application/json",
        },
        payload: {
          message: "viewer should not queue",
        },
      });

      assert.equal(runResponse.statusCode, 403);
      assert.equal(runResponse.json().error, "module_capability_required");
      assert.equal(runResponse.json().requiredCapability, "module-lab.run_job");
    } finally {
      await app.close();
    }
  });
});

await runCase("module-lab workspace access denies status when the user has no module role or membership capability", async () => {
  await withEnabledModules("module-lab", async () => {
    const app = buildApiApp({
      services: createServices({
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
        method: "GET",
        url: "/v1/module-lab?workspaceId=workspace-1",
        headers: {
          authorization: "Bearer valid-token",
        },
      });

      assert.equal(response.statusCode, 403);
      assert.equal(response.json().error, "module_capability_required");
      assert.equal(response.json().requiredCapability, "module-lab.read");
    } finally {
      await app.close();
    }
  });
});

await runCase("strict module-lab backend requires an explicit workspace", async () => {
  await withEnabledModules("module-lab", async () => {
    const app = buildApiApp({
      services: createServices({
        workspaceRbacStrict: true,
      }),
    });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/v1/module-lab",
        headers: {
          authorization: "Bearer valid-token",
        },
      });

      assert.equal(response.statusCode, 400);
      assert.equal(response.json().error, "workspace_required");
    } finally {
      await app.close();
    }
  });
});

await runCase("strict module-lab backend uses workspace module role when workspace is explicit", async () => {
  const queuedJobs = [];

  await withEnabledModules("module-lab", async () => {
    const app = buildApiApp({
      services: createServices({
        workspaceRbacStrict: true,
        async getUserModuleRole() {
          throw new Error("Strict workspace route must not read global module roles.");
        },
        async getWorkspaceMembershipRole({ workspaceId, userId }) {
          assert.equal(workspaceId, "workspace-1");
          assert.equal(userId, "user-123");
          return "member";
        },
        async getUserWorkspaceModuleRole({ workspaceId, userId, moduleId }) {
          assert.equal(workspaceId, "workspace-1");
          assert.equal(userId, "user-123");
          assert.equal(moduleId, "module-lab");
          return "operator";
        },
        async enqueueModuleJob(jobId, payload) {
          queuedJobs.push({ jobId, payload });
          return {
            jobId,
            queue: "module-lab",
            queuedAt: "2026-03-16T00:00:00.000Z",
            provider: null,
            providerJobId: null,
          };
        },
      }),
    });

    try {
      const statusResponse = await app.inject({
        method: "GET",
        url: "/v1/module-lab?workspaceId=workspace-1",
        headers: {
          authorization: "Bearer valid-token",
        },
      });

      assert.equal(statusResponse.statusCode, 200);
      assert.deepEqual(statusResponse.json().capabilities, [
        "module-lab.read",
        "module-lab.run_job",
      ]);

      const runResponse = await app.inject({
        method: "POST",
        url: "/v1/module-lab/job?workspaceId=workspace-1",
        headers: {
          authorization: "Bearer valid-token",
          "content-type": "application/json",
        },
        payload: {
          message: "hello from strict module-lab",
        },
      });

      assert.equal(runResponse.statusCode, 200);
      assert.equal(queuedJobs.length, 1);
      assert.equal(queuedJobs[0].payload.workspaceId, "workspace-1");
    } finally {
      await app.close();
    }
  });
});
