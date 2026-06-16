import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnvFiles } from "../scripts/load-env.mjs";
import { assertApiEnv, getApiConfig } from "./config.mjs";
import { createBullMQWorkerRuntime, hasBullMQConfig } from "./core/queue/bullmq.mjs";
import { createStorageService } from "./services/storage.mjs";
import { createApiServices } from "./supabase.mjs";

const apiDir = path.dirname(fileURLToPath(import.meta.url));

loadEnvFiles([
  path.resolve(apiDir, "../.env.api.local"),
  path.resolve(apiDir, "../.env.local"),
]);

const config = assertApiEnv(getApiConfig());
const storageServices = createStorageService(config);

if (!hasBullMQConfig(config)) {
  throw new Error("Missing REDIS_URL. The worker requires BullMQ Redis configuration.");
}

if (config.storageS3EnsureBucketOnStart) {
  await storageServices.ensureBucketExists();
  console.info("Storage bucket preflight completed", {
    bucket: storageServices.getBucketName(),
  });
}

const runtime = createBullMQWorkerRuntime({
  config,
  services: {
    ...createApiServices(config),
    ...storageServices,
  },
  logger: console,
});

async function shutdown(exitCode = 0) {
  await runtime.close();
  process.exit(exitCode);
}

process.on("SIGINT", () => {
  void shutdown(0);
});

process.on("SIGTERM", () => {
  void shutdown(0);
});

console.info("BullMQ worker started", {
  queues: runtime.workers.map((worker) => worker.name),
  jobs: runtime.workers.flatMap((worker) =>
    runtime
      .getRegisteredJobs()
      .filter((job) => job.queue === worker.name)
      .map((job) => ({
        id: job.id,
        attempts: job.attempts,
        backoffMs: job.backoffMs,
      })),
  ),
});
