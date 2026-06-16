import assert from "node:assert/strict";

import { getApiConfig } from "../config.mjs";
import { getStorageConfig } from "../services/storage.mjs";
import { readEnvFile } from "../../scripts/load-env.mjs";

async function runCase(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

await runCase("api/server.mjs resolves storage env from .env.api.local", async () => {
  const envFile = readEnvFile(".env.api.local");
  const originalEnv = {
    STORAGE_S3_ENDPOINT: process.env.STORAGE_S3_ENDPOINT,
    STORAGE_S3_REGION: process.env.STORAGE_S3_REGION,
    STORAGE_S3_BUCKET: process.env.STORAGE_S3_BUCKET,
    STORAGE_S3_ACCESS_KEY_ID: process.env.STORAGE_S3_ACCESS_KEY_ID,
    STORAGE_S3_SECRET_ACCESS_KEY: process.env.STORAGE_S3_SECRET_ACCESS_KEY,
    STORAGE_S3_FORCE_PATH_STYLE: process.env.STORAGE_S3_FORCE_PATH_STYLE,
    STORAGE_S3_PUBLIC_BASE_URL: process.env.STORAGE_S3_PUBLIC_BASE_URL,
  };

  try {
    process.env.STORAGE_S3_ENDPOINT = envFile.STORAGE_S3_ENDPOINT ?? "";
    process.env.STORAGE_S3_REGION = envFile.STORAGE_S3_REGION ?? "";
    process.env.STORAGE_S3_BUCKET = envFile.STORAGE_S3_BUCKET ?? "";
    process.env.STORAGE_S3_ACCESS_KEY_ID = envFile.STORAGE_S3_ACCESS_KEY_ID ?? "";
    process.env.STORAGE_S3_SECRET_ACCESS_KEY = envFile.STORAGE_S3_SECRET_ACCESS_KEY ?? "";
    process.env.STORAGE_S3_FORCE_PATH_STYLE = envFile.STORAGE_S3_FORCE_PATH_STYLE ?? "";
    process.env.STORAGE_S3_PUBLIC_BASE_URL = envFile.STORAGE_S3_PUBLIC_BASE_URL ?? "";

    const config = getApiConfig();
    const storage = getStorageConfig(config);

    assert.ok(storage.storageS3Endpoint);
    assert.ok(storage.storageS3Region);
    assert.ok(storage.storageS3Bucket);
    assert.ok(storage.storageS3AccessKeyId);
    assert.ok(storage.storageS3SecretAccessKey);
    assert.equal(storage.storageS3Endpoint, (envFile.STORAGE_S3_ENDPOINT ?? "").replace(/\/+$/, ""));
    assert.equal(storage.storageS3Region, envFile.STORAGE_S3_REGION ?? "");
    assert.equal(storage.storageS3Bucket, envFile.STORAGE_S3_BUCKET ?? "");
  } finally {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});
