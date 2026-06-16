import { spawn } from "node:child_process";
import { createE2EWebEnv } from "./e2e-runtime-env.mjs";
import { loadE2EEnv } from "./load-e2e-env.mjs";
import { withFilteredNodeWarnings } from "./warning-filter-env.mjs";

loadE2EEnv();

const childProcesses = [];

const sharedEnv = withFilteredNodeWarnings(process.env);
const webEnv = createE2EWebEnv(sharedEnv);

function runScript(scriptName, env) {
  const child =
    process.platform === "win32"
      ? spawn("cmd.exe", ["/d", "/s", "/c", `npm run ${scriptName}`], {
          stdio: "inherit",
          env,
        })
      : spawn("npm", ["run", scriptName], {
          stdio: "inherit",
          env,
        });

  childProcesses.push(child);

  child.on("exit", (code) => {
    if (code && code !== 0) {
      shutdown(code);
    }
  });
}

function shutdown(exitCode = 0) {
  for (const child of childProcesses) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  process.exit(exitCode);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

runScript("dev:api", sharedEnv);
runScript("dev:worker", sharedEnv);
runScript("dev:web", webEnv);
