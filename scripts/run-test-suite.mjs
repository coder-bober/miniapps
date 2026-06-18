import { listTestSuites, runTestSuite } from "./test-suite-runner.mjs";

const [suiteId] = process.argv.slice(2);

if (!suiteId || suiteId === "--help" || suiteId === "-h") {
  console.error("Usage: node scripts/run-test-suite.mjs <suite-id>");
  console.error("");
  console.error("Available suites:");
  for (const suite of listTestSuites()) {
    console.error(`  ${suite.id.padEnd(38)} ${suite.label} (${suite.type})`);
  }
  process.exit(suiteId ? 0 : 1);
}

try {
  await runTestSuite(suiteId);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
