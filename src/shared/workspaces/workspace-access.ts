export * from "./workspace-access.mjs";

import type { ModuleCapability, ModuleRole } from "@/shared/modules/module-capabilities";

export type WorkspaceMembershipRole = "owner" | "admin" | "member";

export type WorkspaceModuleAccess = {
  workspaceId: string | null;
  membershipRole: WorkspaceMembershipRole | null;
  moduleRole: ModuleRole | null;
  capabilities: ModuleCapability[];
};

export type WorkspaceContext = {
  workspaceId: string | null;
  workspaceSlug: string;
};
