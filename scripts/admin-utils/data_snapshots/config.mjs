import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../",
);

export default {
  projectRoot,
  useEnv: [".env.api.e2e.local", ".env.e2e.local"],
  snapshotsDir: "scripts/admin-utils/data_snapshots/snapshots",
  logFile: "last-run.json",
  auth: {
    enabled: true,
    file: "auth-users.json",
    restoreUsers: true,
    restorePassword: "RestoredSnapshot!ChangeMe1",
  },
  tables: [
    { name: "profiles", orderBy: ["id"], conflictColumns: ["id"] },
    { name: "workspaces", orderBy: ["id"], conflictColumns: ["id"] },
    { name: "workspace_memberships", orderBy: ["workspace_id", "user_id"], conflictColumns: ["id"] },
    { name: "workspace_module_roles", orderBy: ["workspace_id", "user_id", "module_id"], conflictColumns: ["id"] },
    { name: "workspace_files", orderBy: ["storage_bucket", "storage_key"], conflictColumns: ["id"] },
  ],
  restore: {
    deleteOrder: [
      "workspace_module_roles",
      "workspace_files",
      "workspace_memberships",
      "workspaces",
      "profiles",
    ],
    insertOrder: [
      "profiles",
      "workspaces",
      "workspace_memberships",
      "workspace_module_roles",
      "workspace_files",
    ],
  },
  storage: {
    enabled: true,
    bucketsFromEnv: ["STORAGE_S3_BUCKET"],
    listPageSize: 100,
    saveObjectBodies: false,
  },
};
