import { spawn } from "node:child_process";

import { getSuite, testSuites } from "./test-suite-manifest.mjs";

export function formatDuration(durationMs) {
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

function runCommand({ command, args }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`Command "${command}" exited with signal ${signal}.`));
        return;
      }

      if (code && code !== 0) {
        reject(new Error(`Command "${command}" failed with exit code ${code}.`));
        return;
      }

      resolve();
    });
  });
}

export async function runTestSuite(suiteId) {
  const suite = getSuite(suiteId);

  if (suite.aliasOf) {
    await runTestSuite(suite.aliasOf);
    return;
  }

  if (suite.children) {
    const startedAt = Date.now();

    for (const childSuiteId of suite.children) {
      const childSuite = getSuite(childSuiteId);
      const childStartedAt = Date.now();
      await runTestSuite(childSuiteId);
      console.log(
        `[${suite.label}] ${childSuite.label} completed in ${formatDuration(Date.now() - childStartedAt)}`,
      );
    }

    console.log(`[${suite.label}] total time: ${formatDuration(Date.now() - startedAt)}`);
    return;
  }

  await runCommand(suite);
}

export function listTestSuites() {
  return Object.entries(testSuites).map(([id, suite]) => ({
    id,
    label: suite.label,
    type: suite.children ? "aggregate" : suite.aliasOf ? "alias" : "command",
  }));
}
