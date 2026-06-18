const nodeCommand = process.execPath;
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function nodeScript(scriptPath, ...args) {
  return {
    command: nodeCommand,
    args: [scriptPath, ...args],
  };
}

function npmScript(scriptName) {
  return {
    command: npmCommand,
    args: ["run", scriptName],
  };
}

export const testSuites = {
  all: {
    label: "test:all",
    children: ["api:all", "e2e:all", "e2e:prod:all"],
  },
  api: {
    label: "test:api",
    aliasOf: "api:all",
  },
  "api:all": {
    label: "test:api:all",
    children: [
      "api:routes",
      "api:modules",
      "api:next-proxy:workspaces",
      "api:next-proxy:workspace-members",
      "api:next-proxy:workspace-member-item-routes",
      "api:next-proxy:module-lab",
      "api:next-proxy:workspace-files",
      "api:next-proxy:workspace-file-item-routes",
      "api:workspace-compat",
      "api:workspace-rbac",
      "api:sql-workspace-rbac",
      "api:frontend-workspace-rbac",
      "api:app-admin-access",
      "api:admin-workspace-service",
      "api:admin-workspace-routes",
      "api:next-proxy:admin-workspaces",
      "api:sign-out-redirect",
      "api:auth-callback-redirect",
      "api:sql-user-module-roles-retirement",
      "api:storage",
      "api:env:dev",
      "api:integration:account",
      "api:integration:workspace",
    ],
  },
  "api:routes": {
    label: "test:api:routes",
    children: [
      "api:routes:account",
      "api:routes:workspaces",
      "api:routes:workspace-files",
      "api:queue-service",
    ],
  },
  "api:routes:account": {
    label: "test:api:routes:account",
    ...nodeScript("scripts/run-node-with-warning-filter.mjs", "api/tests/account-routes.test.mjs"),
  },
  "api:routes:workspaces": {
    label: "test:api:routes:workspaces",
    ...nodeScript("scripts/run-node-with-warning-filter.mjs", "api/tests/workspace-routes.test.mjs"),
  },
  "api:routes:workspace-files": {
    label: "test:api:routes:workspace-files",
    ...nodeScript("scripts/run-node-with-warning-filter.mjs", "api/tests/workspace-file-routes.test.mjs"),
  },
  "api:queue-service": {
    label: "test:api:queue-service",
    ...nodeScript("scripts/run-node-with-warning-filter.mjs", "api/tests/queue-service.test.mjs"),
  },
  "api:modules": {
    label: "test:api:modules",
    ...nodeScript("scripts/run-node-with-warning-filter.mjs", "api/tests/module-toggle.test.mjs"),
  },
  "api:next-proxy:workspaces": {
    label: "test:api:next-proxy:workspaces",
    ...nodeScript("scripts/run-node-with-warning-filter.mjs", "api/tests/next-workspaces-route.test.mjs"),
  },
  "api:next-proxy:workspace-members": {
    label: "test:api:next-proxy:workspace-members",
    ...nodeScript("scripts/run-node-with-warning-filter.mjs", "api/tests/next-workspace-members-route.test.mjs"),
  },
  "api:next-proxy:workspace-member-item-routes": {
    label: "test:api:next-proxy:workspace-member-item-routes",
    ...nodeScript(
      "scripts/run-node-with-warning-filter.mjs",
      "api/tests/next-workspace-member-item-routes.test.mjs",
    ),
  },
  "api:next-proxy:module-lab": {
    label: "test:api:next-proxy:module-lab",
    ...nodeScript("scripts/run-node-with-warning-filter.mjs", "api/tests/next-module-lab-route.test.mjs"),
  },
  "api:next-proxy:workspace-files": {
    label: "test:api:next-proxy:workspace-files",
    ...nodeScript("scripts/run-node-with-warning-filter.mjs", "api/tests/next-workspace-files-route.test.mjs"),
  },
  "api:next-proxy:workspace-file-item-routes": {
    label: "test:api:next-proxy:workspace-file-item-routes",
    ...nodeScript(
      "scripts/run-node-with-warning-filter.mjs",
      "api/tests/next-workspace-file-item-routes.test.mjs",
    ),
  },
  "api:workspace-compat": {
    label: "test:api:workspace-compat",
    ...nodeScript("scripts/run-node-with-warning-filter.mjs", "api/tests/workspace-supabase-compat.test.mjs"),
  },
  "api:workspace-rbac": {
    label: "test:api:workspace-rbac",
    ...nodeScript("scripts/run-node-with-warning-filter.mjs", "api/tests/workspace-rbac-strict.test.mjs"),
  },
  "api:sql-workspace-rbac": {
    label: "test:api:sql-workspace-rbac",
    ...nodeScript("scripts/run-node-with-warning-filter.mjs", "api/tests/sql-workspace-rbac-docs.test.mjs"),
  },
  "api:frontend-workspace-rbac": {
    label: "test:api:frontend-workspace-rbac",
    ...nodeScript("scripts/run-node-with-warning-filter.mjs", "api/tests/frontend-workspace-rbac-source.test.mjs"),
  },
  "api:app-admin-access": {
    label: "test:api:app-admin-access",
    ...nodeScript("scripts/run-node-with-warning-filter.mjs", "api/tests/app-admin-access.test.mjs"),
  },
  "api:admin-workspace-service": {
    label: "test:api:admin-workspace-service",
    ...nodeScript("scripts/run-node-with-warning-filter.mjs", "api/tests/admin-workspace-service.test.mjs"),
  },
  "api:admin-workspace-routes": {
    label: "test:api:admin-workspace-routes",
    ...nodeScript("scripts/run-node-with-warning-filter.mjs", "api/tests/admin-workspace-routes.test.mjs"),
  },
  "api:next-proxy:admin-workspaces": {
    label: "test:api:next-proxy:admin-workspaces",
    ...nodeScript("scripts/run-node-with-warning-filter.mjs", "api/tests/next-admin-workspace-routes.test.mjs"),
  },
  "api:sign-out-redirect": {
    label: "test:api:sign-out-redirect",
    ...nodeScript("scripts/run-node-with-warning-filter.mjs", "api/tests/sign-out-redirect-url.test.mjs"),
  },
  "api:auth-callback-redirect": {
    label: "test:api:auth-callback-redirect",
    ...nodeScript("scripts/run-node-with-warning-filter.mjs", "api/tests/auth-callback-redirect-url.test.mjs"),
  },
  "api:sql-user-module-roles-retirement": {
    label: "test:api:sql-user-module-roles-retirement",
    ...nodeScript("scripts/run-node-with-warning-filter.mjs", "api/tests/sql-user-module-roles-retirement.test.mjs"),
  },
  "api:storage": {
    label: "test:api:storage",
    ...nodeScript("scripts/run-node-with-warning-filter.mjs", "api/tests/storage-bucket.test.mjs"),
  },
  "api:env:dev": {
    label: "test:api:env:dev",
    ...nodeScript("scripts/run-node-with-warning-filter.mjs", "api/tests/dev-env-loading.test.mjs"),
  },
  "api:integration:account": {
    label: "test:api:integration:account",
    ...nodeScript("scripts/run-node-with-warning-filter.mjs", "api/tests/account-integration.test.mjs"),
  },
  "api:integration:workspace": {
    label: "test:api:integration:workspace",
    ...nodeScript("scripts/run-node-with-warning-filter.mjs", "api/tests/workspace-files-integration.test.mjs"),
  },
  e2e: {
    label: "test:e2e",
    aliasOf: "e2e:smoke",
  },
  "e2e:all": {
    label: "test:e2e:all",
    children: [
      "e2e:smoke",
      "e2e:auth",
      "e2e:security",
      "e2e:module-lab",
      "e2e:module-lab-disabled",
      "e2e:combined",
      "e2e:no-modules",
    ],
  },
  "e2e:smoke": {
    label: "test:e2e:smoke",
    ...nodeScript("scripts/run-playwright.mjs", "smoke", "--enabled-modules=workspace-files"),
  },
  "e2e:auth": {
    label: "test:e2e:auth",
    ...nodeScript("scripts/run-playwright.mjs", "auth", "tests/auth", "--enabled-modules=workspace-files"),
  },
  "e2e:security": {
    label: "test:e2e:security",
    ...nodeScript("scripts/run-playwright.mjs", "security", "tests/security", "--enabled-modules=workspace-files"),
  },
  "e2e:module-lab": {
    label: "test:e2e:module-lab",
    ...nodeScript(
      "scripts/run-playwright.mjs",
      "module-lab",
      "tests/module-lab-public.spec.ts",
      "--enabled-modules=workspace-files,module-lab",
    ),
  },
  "e2e:module-lab-disabled": {
    label: "test:e2e:module-lab-disabled",
    ...nodeScript(
      "scripts/run-playwright.mjs",
      "module-lab-disabled",
      "tests/module-lab-disabled.spec.ts",
      "--enabled-modules=workspace-files",
    ),
  },
  "e2e:combined": {
    label: "test:e2e:combined",
    ...nodeScript("scripts/run-playwright.mjs", "combined", "--enabled-modules=workspace-files,module-lab"),
  },
  "e2e:no-modules": {
    label: "test:e2e:no-modules",
    ...nodeScript("scripts/run-playwright.mjs", "no-modules", "--enabled-modules="),
  },
  "e2e:prod": {
    label: "test:e2e:prod",
    aliasOf: "e2e:prod:smoke",
  },
  "e2e:prod:all": {
    label: "test:e2e:prod:all",
    children: [
      "e2e:prod:smoke",
      "e2e:prod:auth:focus",
      "e2e:prod:workspace-files:focus",
      "e2e:prod:module-lab",
    ],
  },
  "e2e:prod:smoke": {
    label: "test:e2e:prod:smoke",
    ...nodeScript("scripts/run-playwright-prod.mjs", "smoke", "--enabled-modules=workspace-files"),
  },
  "e2e:prod:module-lab": {
    label: "test:e2e:prod:module-lab",
    ...nodeScript(
      "scripts/run-playwright-prod.mjs",
      "module-lab",
      "tests/module-lab-public.spec.ts",
      "--enabled-modules=workspace-files,module-lab",
    ),
  },
  "e2e:prod:prepare": {
    label: "test:e2e:prod:prepare",
    ...npmScript("build:e2e"),
  },
  "e2e:prod:auth:focus": {
    label: "test:e2e:prod:auth:focus",
    ...nodeScript(
      "scripts/run-playwright-prod.mjs",
      "auth",
      "tests/auth/account-deletion.spec.ts",
      "tests/auth/session-management.spec.ts",
      "tests/auth/settings.spec.ts",
      "--enabled-modules=workspace-files",
    ),
  },
  "e2e:prod:workspace-files:focus": {
    label: "test:e2e:prod:workspace-files:focus",
    ...nodeScript(
      "scripts/run-playwright-prod.mjs",
      "workspace-files",
      "tests/auth/workspace-files.spec.ts",
      "--enabled-modules=workspace-files",
    ),
  },
};

export function normalizeSuiteId(suiteId) {
  return suiteId.startsWith("test:") ? suiteId.slice("test:".length) : suiteId;
}

export function getSuite(suiteId) {
  const normalizedSuiteId = normalizeSuiteId(suiteId);
  const suite = testSuites[normalizedSuiteId];

  if (!suite) {
    throw new Error(`Unknown test suite "${suiteId}".`);
  }

  return {
    id: normalizedSuiteId,
    ...suite,
  };
}
