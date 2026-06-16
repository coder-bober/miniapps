import IORedis from "ioredis";

import { assertApiEnv, getApiConfig } from "../api/config.mjs";
import { createStorageService, getStorageConfig } from "../api/services/storage.mjs";
import { loadEnvFiles } from "./load-env.mjs";

loadEnvFiles([".env.api.local", ".env.local"]);

const config = assertApiEnv(getApiConfig());
const storageConfig = getStorageConfig(config);
const storage = createStorageService(config);

async function checkStorage() {
  await storage.ensureBucketExists();

  return {
    endpoint: storageConfig.storageS3Endpoint,
    bucket: storageConfig.storageS3Bucket,
  };
}

async function checkRedis() {
  if (!config.redisUrl) {
    return {
      enabled: false,
      status: "skipped",
    };
  }

  const redis = new IORedis(config.redisUrl, {
    maxRetriesPerRequest: config.redisMaxRetriesPerRequest,
  });

  try {
    const pong = await redis.ping();

    return {
      enabled: true,
      status: pong,
    };
  } finally {
    await redis.quit();
  }
}

try {
  const [storageStatus, redisStatus] = await Promise.all([
    checkStorage(),
    checkRedis(),
  ]);

  console.log("Infrastructure health check passed.");
  console.log(`Storage endpoint: ${storageStatus.endpoint}`);
  console.log(`Storage bucket: ${storageStatus.bucket}`);
  if (redisStatus.enabled) {
    console.log(`Redis: ${redisStatus.status}`);
  } else {
    console.log("Redis: skipped (REDIS_URL is not configured)");
  }
} catch (error) {
  console.error("Infrastructure health check failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
