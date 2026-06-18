import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../",
);

export default {
  projectRoot,
  useEnv: [".env.api.e2e.local", ".env.e2e.local"],
  useSqlFiles: [
    "docs/SQL/reset-supabase-full.sql",
    "docs/SQL/bootstrap-supabase-initial.sql",
  ],
  sql: {
    enabled: true,
    required: false,
    method: "auto",
    rpcName: "exec_sql",
    rpcSqlArgument: "sql",
    metaPath: "/pg/meta/query",
  },
  dataReset: {
    enabled: true,
    publicTables: [
      "workspace_module_roles",
      "workspace_memberships",
      "workspaces",
      "user_module_roles",
      "workspace_files",
      "profiles",
    ],
  },
  storage: {
    enabled: true,
    bucketsFromEnv: ["STORAGE_S3_BUCKET"],
    listPageSize: 100,
  },
  redis: {
    enabled: true,
    mode: "flushdb",
  },
  logFile: "last-run.json",
};
