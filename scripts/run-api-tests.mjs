import { spawn } from "node:child_process";

const apiTestScripts = [
  "test:api:routes",
  "test:api:modules",
  "test:api:next-proxy:workspaces",
  "test:api:next-proxy:workspace-members",
  "test:api:next-proxy:workspace-member-item-routes",
  "test:api:next-proxy:module-lab",
  "test:api:next-proxy:workspace-files",
  "test:api:next-proxy:workspace-file-item-routes",
  "test:api:workspace-compat",
  "test:api:workspace-rbac",
  "test:api:sql-workspace-rbac",
  "test:api:frontend-workspace-rbac",
  "test:api:app-admin-access",
  "test:api:admin-workspace-service",
  "test:api:admin-workspace-routes",
  "test:api:next-proxy:admin-workspaces",
  "test:api:sign-out-redirect",
  "test:api:auth-callback-redirect",
  "test:api:sql-user-module-roles-retirement",
  "test:api:storage",
  "test:api:env:dev",
  "test:api:integration:account",
  "test:api:integration:workspace",
];

function formatDuration(durationMs) {
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    const child =
      process.platform === "win32"
        ? spawn("cmd.exe", ["/d", "/s", "/c", `npm run ${scriptName}`], {
            stdio: "inherit",
            env: process.env,
          })
        : spawn("npm", ["run", scriptName], {
            stdio: "inherit",
            env: process.env,
          });

    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`Script "${scriptName}" exited with signal ${signal}.`));
        return;
      }

      if (code && code !== 0) {
        reject(new Error(`Script "${scriptName}" failed with exit code ${code}.`));
        return;
      }

      resolve();
    });
  });
}

const startedAt = Date.now();

for (const scriptName of apiTestScripts) {
  const scriptStartedAt = Date.now();
  await runScript(scriptName);
  console.log(`[test:api:all] ${scriptName} completed in ${formatDuration(Date.now() - scriptStartedAt)}`);
}

console.log(`[test:api:all] total time: ${formatDuration(Date.now() - startedAt)}`);
