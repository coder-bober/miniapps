import assert from "node:assert/strict";
import { runCase } from "./helpers/test-helpers.mjs";

import { getUserWorkspaceModuleAccess } from "../core/authz/module-access.mjs";
import { resolveDefaultWorkspaceMembershipCapabilities } from "../../src/shared/modules/module-capabilities.mjs";


await runCase("workspace-files member defaults do not include delete", async () => {
  assert.deepEqual(resolveDefaultWorkspaceMembershipCapabilities("workspace-files", "member"), [
    "workspace-files.read",
    "workspace-files.upload",
  ]);
});

await runCase("workspace RBAC does not grant legacy capabilities without workspace", async () => {
  const services = {
    async getUserModuleRole() {
      return "operator";
    },
  };

  const access = await getUserWorkspaceModuleAccess({
    services,
    userId: "user-123",
    workspaceId: null,
    moduleId: "workspace-files",
  });

  assert.deepEqual(access, {
    workspaceId: null,
    membershipRole: null,
    moduleRole: null,
    capabilities: [],
  });
});

await runCase("workspace RBAC does not fall back to global module role when workspace membership is unavailable", async () => {
  const services = {
    async getUserModuleRole() {
      return "operator";
    },
    async getWorkspaceMembershipRole() {
      return null;
    },
    async getUserWorkspaceModuleRole() {
      return "operator";
    },
  };

  const access = await getUserWorkspaceModuleAccess({
    services,
    userId: "user-123",
    workspaceId: "workspace-1",
    moduleId: "module-lab",
  });

  assert.deepEqual(access, {
    workspaceId: "workspace-1",
    membershipRole: null,
    moduleRole: null,
    capabilities: [],
  });
});

await runCase("workspace module role grants module-lab capabilities after baseline membership", async () => {
  const services = {
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
  };

  const access = await getUserWorkspaceModuleAccess({
    services,
    userId: "user-123",
    workspaceId: "workspace-1",
    moduleId: "module-lab",
  });

  assert.deepEqual(access, {
    workspaceId: "workspace-1",
    membershipRole: "member",
    moduleRole: "operator",
    capabilities: ["module-lab.read", "module-lab.run_job"],
  });
});

await runCase("module-lab membership baseline has no capabilities when module role is absent", async () => {
  const services = {
    async getUserModuleRole() {
      throw new Error("Workspace access must not read global module roles.");
    },
    async getWorkspaceMembershipRole() {
      return "member";
    },
    async getUserWorkspaceModuleRole() {
      return null;
    },
  };

  const access = await getUserWorkspaceModuleAccess({
    services,
    userId: "user-123",
    workspaceId: "workspace-1",
    moduleId: "module-lab",
  });

  assert.deepEqual(access, {
    workspaceId: "workspace-1",
    membershipRole: "member",
    moduleRole: null,
    capabilities: [],
  });
});
