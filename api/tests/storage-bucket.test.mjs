import assert from "node:assert/strict";
import { runCase } from "./helpers/test-helpers.mjs";

import { classifyStorageError, createStorageService } from "../services/storage.mjs";


await runCase("ensureBucketExists creates the bucket when it is missing", async () => {
  const sentCommands = [];
  const service = createStorageService(
    {
      storageS3Endpoint: "http://127.0.0.1:8333",
      storageS3Region: "us-east-1",
      storageS3Bucket: "workspace-files-e2e",
      storageS3AccessKeyId: "test-access-key",
      storageS3SecretAccessKey: "test-secret-key",
      storageS3ForcePathStyle: true,
      storageS3PublicBaseUrl: "",
    },
    {
      client: {
        send: async (command) => {
          sentCommands.push(command.constructor.name);

          if (command.constructor.name === "HeadBucketCommand") {
            const error = new Error("Not Found");
            error.name = "NotFound";
            error.$metadata = {
              httpStatusCode: 404,
            };
            throw error;
          }

          return {
            $metadata: {
              httpStatusCode: 200,
            },
          };
        },
      },
    },
  );

  await service.ensureBucketExists();

  assert.deepEqual(sentCommands, ["HeadBucketCommand", "CreateBucketCommand"]);
});

await runCase("ensureBucketExists does not create the bucket when it already exists", async () => {
  const sentCommands = [];
  const service = createStorageService(
    {
      storageS3Endpoint: "http://127.0.0.1:8333",
      storageS3Region: "us-east-1",
      storageS3Bucket: "workspace-files-e2e",
      storageS3AccessKeyId: "test-access-key",
      storageS3SecretAccessKey: "test-secret-key",
      storageS3ForcePathStyle: true,
      storageS3PublicBaseUrl: "",
    },
    {
      client: {
        send: async (command) => {
          sentCommands.push(command.constructor.name);

          return {
            $metadata: {
              httpStatusCode: 200,
            },
          };
        },
      },
    },
  );

  await service.ensureBucketExists();

  assert.deepEqual(sentCommands, ["HeadBucketCommand"]);
});

await runCase("storage timeout errors are classified as unreachable", async () => {
  const error = new Error(
    "@smithy/node-http-handler - [ERROR] a request has exceeded the configured 10000 ms requestTimeout.",
  );
  error.name = "TimeoutError";
  error.code = "ETIMEDOUT";

  assert.equal(classifyStorageError(error), "unreachable");
});
