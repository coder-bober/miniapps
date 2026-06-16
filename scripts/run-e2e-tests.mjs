import { spawn } from "node:child_process";

const e2eTestScripts = [
  "test:e2e",
  "test:e2e:auth",
  "test:e2e:security",
  "test:e2e:module-lab",
  "test:e2e:module-lab-disabled",
  "test:e2e:combined",
  "test:e2e:no-modules",
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

for (const scriptName of e2eTestScripts) {
  const scriptStartedAt = Date.now();
  await runScript(scriptName);
  console.log(`[test:e2e:all] ${scriptName} completed in ${formatDuration(Date.now() - scriptStartedAt)}`);
}

console.log(`[test:e2e:all] total time: ${formatDuration(Date.now() - startedAt)}`);
