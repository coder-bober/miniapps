import { readEnvFile } from "./load-env.mjs";

function normalizeBucketName(bucketName) {
  return bucketName?.trim() ?? "";
}

export function assertTestStorageIsolation({
  devEnvFile = ".env.api.local",
  testEnvFile = ".env.api.e2e.local",
} = {}) {
  const devEnv = readEnvFile(devEnvFile);
  const testEnv = readEnvFile(testEnvFile);

  const devBucket = normalizeBucketName(devEnv.STORAGE_S3_BUCKET);
  const testBucket = normalizeBucketName(testEnv.STORAGE_S3_BUCKET);

  if (!devBucket || !testBucket) {
    return;
  }

  if (devBucket === testBucket) {
    throw new Error(
      [
        "Test storage isolation check failed.",
        `Both ${devEnvFile} and ${testEnvFile} use STORAGE_S3_BUCKET=${devBucket}.`,
        "Use a dedicated E2E bucket so tests do not write into the local development bucket.",
      ].join("\n"),
    );
  }
}
