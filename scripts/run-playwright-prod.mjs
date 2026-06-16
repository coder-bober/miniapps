import { spawn } from "node:child_process";

function spawnCommand(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env,
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }

      resolve(code ?? 1);
    });
  });
}

const passthroughArgs = process.argv.slice(2);

const buildCommand =
  process.platform === "win32"
    ? {
        file: "cmd.exe",
        args: ["/d", "/s", "/c", "npm run test:e2e:prod:prepare"],
      }
    : {
        file: "npm",
        args: ["run", "test:e2e:prod:prepare"],
      };

const playwrightCommand =
  process.platform === "win32"
    ? {
        file: process.execPath,
        args: ["scripts/run-playwright.mjs", "--prod", ...passthroughArgs],
      }
    : {
        file: "node",
        args: ["scripts/run-playwright.mjs", "--prod", ...passthroughArgs],
      };

const sharedEnv = {
  ...process.env,
};

const buildExitCode = await spawnCommand(buildCommand.file, buildCommand.args, sharedEnv);

if (buildExitCode !== 0) {
  process.exit(buildExitCode);
}

const testExitCode = await spawnCommand(playwrightCommand.file, playwrightCommand.args, sharedEnv);
process.exit(testExitCode);
