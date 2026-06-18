export { runCase } from "./test-helpers.mjs";

export function createServices(overrides = {}) {
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
