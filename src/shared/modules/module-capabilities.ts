export * from "./module-capabilities.mjs";

export type ModuleLabRole = "viewer" | "operator";
export type ModuleRole = ModuleLabRole;

export type ModuleLabCapability = "module-lab.read" | "module-lab.run_job";
export type WorkspaceFilesCapability =
  | "workspace-files.read"
  | "workspace-files.upload"
  | "workspace-files.delete";
export type ModuleCapability = ModuleLabCapability | WorkspaceFilesCapability;

export type ModuleAccess = {
  moduleId: string;
  role: ModuleRole | null;
  capabilities: ModuleCapability[];
};
