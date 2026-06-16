import { spawn } from "node:child_process";

import { loadE2EEnv } from "./load-e2e-env.mjs";

loadE2EEnv();

const command =
  process.platform === "win32"
    ? {
        file: "cmd.exe",
        args: ["/d", "/s", "/c", "npx next build"],
      }
    : {
        file: "npx",
        args: ["next", "build"],
      };

const child = spawn(command.file, command.args, {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
