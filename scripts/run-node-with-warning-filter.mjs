import { spawn } from "node:child_process";

import { withFilteredNodeWarnings } from "./warning-filter-env.mjs";

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Expected a Node script path.");
  process.exit(1);
}

const child = spawn(process.execPath, args, {
  stdio: "inherit",
  env: withFilteredNodeWarnings(process.env),
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
