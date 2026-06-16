import { assertApiEnv, getApiConfig } from "../api/config.mjs";
import { createStorageService, getStorageConfig } from "../api/services/storage.mjs";
import { loadEnvFiles } from "./load-env.mjs";

loadEnvFiles([".env.api.local", ".env.local"]);

const config = assertApiEnv(getApiConfig());
const storageConfig = getStorageConfig(config);
const storage = createStorageService(config);

try {
  await storage.ensureBucketExists();

  console.log("Storage health check passed.");
  console.log(`Endpoint: ${storageConfig.storageS3Endpoint}`);
  console.log(`Bucket: ${storageConfig.storageS3Bucket}`);
} catch (error) {
  console.error("Storage health check failed.");
  console.error(`Endpoint: ${storageConfig.storageS3Endpoint}`);
  console.error(`Bucket: ${storageConfig.storageS3Bucket}`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
