import { spawn } from "node:child_process";

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
  env: {
    ...process.env,
    NEXT_DIST_DIR: process.env.NEXT_DIST_DIR ?? ".next-e2e-prod",
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
