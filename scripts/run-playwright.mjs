import { spawn } from "node:child_process";
import path from "node:path";
import { withFilteredNodeWarnings } from "./warning-filter-env.mjs";

function createTimestamp() {
  const now = new Date();
  const parts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    "-",
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
    "-",
    String(now.getMilliseconds()).padStart(3, "0"),
  ];

  return parts.join("");
}

const rawCliArgs = process.argv.slice(2);
let suite = "run";
const playwrightArgs = [];
let enabledModulesOverride = process.env.PLAYWRIGHT_ENABLED_MODULES;
let useProductionServer = false;

for (const arg of rawCliArgs) {
  if (arg === "--prod") {
    useProductionServer = true;
    continue;
  }

  if (arg.startsWith("--enabled-modules=")) {
    enabledModulesOverride = arg.slice("--enabled-modules=".length);
    continue;
  }

  if (suite === "run") {
    suite = arg;
    continue;
  }

  playwrightArgs.push(arg);
}

const outputDir = path.join("test-results", `${createTimestamp()}-${suite}`);

console.log(`Playwright output: ${outputDir}`);

const childEnv = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => key !== "ENABLED_MODULES"),
);

const command =
  process.platform === "win32"
    ? {
        file: "cmd.exe",
        args: ["/d", "/s", "/c", `npx playwright test ${playwrightArgs.join(" ")}`.trim()],
      }
    : {
        file: "npx",
        args: ["playwright", "test", ...playwrightArgs],
      };

const child = spawn(command.file, command.args, {
  stdio: "inherit",
  env: withFilteredNodeWarnings({
    ...childEnv,
    PLAYWRIGHT_OUTPUT_DIR: outputDir,
    PLAYWRIGHT_REUSE_SERVER:
      process.env.PLAYWRIGHT_REUSE_SERVER ?? (useProductionServer ? "false" : "true"),
    ...(useProductionServer
      ? {
          PLAYWRIGHT_SERVER_COMMAND: "node scripts/start-e2e.mjs",
        }
      : {}),
    ...(enabledModulesOverride !== undefined
      ? { ENABLED_MODULES: enabledModulesOverride }
      : {}),
    APP_ADMIN_EMAILS: childEnv.APP_ADMIN_EMAILS ?? "e2e-app-admin@example.com",
  }),
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
