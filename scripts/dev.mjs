import { spawn } from "node:child_process";
// import { loadEnvFiles } from "./load-env.mjs";
// loadEnvFiles([".env.api.local", ".env.local"]);

const childProcesses = [];

function runScript(scriptName) {
  
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

runScript("dev:api");
runScript("dev:worker");
runScript("dev:web");
