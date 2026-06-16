import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { getApiConfig } from "../config.mjs";

function normalizeStorageEndpoint(endpoint) {
  return endpoint?.trim().replace(/\/+$/, "") ?? "";
}

export function getStorageConfig(config = getApiConfig()) {
  return {
    storageS3Endpoint: normalizeStorageEndpoint(config.storageS3Endpoint),
    storageS3Region: config.storageS3Region?.trim() ?? "",
    storageS3Bucket: config.storageS3Bucket?.trim() ?? "",
    storageS3AccessKeyId: config.storageS3AccessKeyId?.trim() ?? "",
    storageS3SecretAccessKey: config.storageS3SecretAccessKey?.trim() ?? "",
    storageS3ForcePathStyle: config.storageS3ForcePathStyle,
    storageS3PublicBaseUrl: normalizeStorageEndpoint(config.storageS3PublicBaseUrl),
  };
}

export function assertStorageEnv(config = getStorageConfig()) {
  if (
    !config.storageS3Endpoint ||
    !config.storageS3Region ||
    !config.storageS3Bucket ||
    !config.storageS3AccessKeyId ||
    !config.storageS3SecretAccessKey
  ) {
    throw new Error(
      "Missing storage environment variables. Expected STORAGE_S3_ENDPOINT, STORAGE_S3_REGION, STORAGE_S3_BUCKET, STORAGE_S3_ACCESS_KEY_ID, and STORAGE_S3_SECRET_ACCESS_KEY.",
    );
  }

  return config;
}

export function createStorageService(config = getApiConfig(), overrides = {}) {
  const resolvedConfig = assertStorageEnv(getStorageConfig(config));
  const client = overrides.client ?? createStorageClient(resolvedConfig);

  return {
    getBucketName() {
      return resolvedConfig.storageS3Bucket;
    },
    async ensureBucketExists() {
      try {
        await client.send(
          new HeadBucketCommand({
            Bucket: resolvedConfig.storageS3Bucket,
          }),
        );
        return;
      } catch (error) {
        if (!isMissingBucketError(error)) {
          throw error;
        }
      }

      await client.send(
        new CreateBucketCommand({
          Bucket: resolvedConfig.storageS3Bucket,
        }),
      );
    },
    buildWorkspaceObjectKey({ userId, workspaceSlug, fileName }) {
      const safeName = fileName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "");

      return `workspace/${userId}/${workspaceSlug}/${safeName || "file"}`;
    },
    buildWorkspaceThumbnailObjectKey({ storageKey }) {
      const normalizedKey = storageKey.trim().replace(/^\/+/, "");
      return `${normalizedKey}.thumbnail.webp`;
    },
    getPublicBaseUrl() {
      return resolvedConfig.storageS3PublicBaseUrl || null;
    },
    async uploadWorkspaceFileObject({ storageKey, body, contentType }) {
      await client.send(
        new PutObjectCommand({
          Bucket: resolvedConfig.storageS3Bucket,
          Key: storageKey,
          Body: body,
          ContentType: contentType,
        }),
      );
    },
    async downloadWorkspaceFileObject({ storageKey }) {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: resolvedConfig.storageS3Bucket,
          Key: storageKey,
        }),
      );

      return streamToBuffer(response.Body);
    },
    async uploadWorkspaceThumbnailObject({ storageKey, body }) {
      await client.send(
        new PutObjectCommand({
          Bucket: resolvedConfig.storageS3Bucket,
          Key: storageKey,
          Body: body,
          ContentType: "image/webp",
        }),
      );
    },
    async deleteWorkspaceFileObject({ storageKey }) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: resolvedConfig.storageS3Bucket,
          Key: storageKey,
        }),
      );
    },
  };
}

export function createStorageClient(config = getStorageConfig()) {
  const resolvedConfig = assertStorageEnv(config);

  return new S3Client({
    endpoint: resolvedConfig.storageS3Endpoint,
    region: resolvedConfig.storageS3Region,
    forcePathStyle: resolvedConfig.storageS3ForcePathStyle,
    credentials: {
      accessKeyId: resolvedConfig.storageS3AccessKeyId,
      secretAccessKey: resolvedConfig.storageS3SecretAccessKey,
    },
  });
}

function isMissingBucketError(error) {
  const errorCode = error?.name ?? error?.Code ?? error?.code ?? "";
  const httpStatusCode = error?.$metadata?.httpStatusCode ?? null;

  return (
    errorCode === "NotFound" ||
    errorCode === "NoSuchBucket" ||
    httpStatusCode === 404
  );
}

export function classifyStorageError(error) {
  const errorCode = error?.name ?? error?.Code ?? error?.code ?? "";
  const httpStatusCode = error?.$metadata?.httpStatusCode ?? null;
  const message = error?.message ?? String(error);

  if (
    errorCode === "ECONNREFUSED" ||
    errorCode === "ETIMEDOUT" ||
    errorCode === "NetworkingError" ||
    message.includes("ECONNREFUSED") ||
    message.includes("ETIMEDOUT") ||
    message.toLowerCase().includes("network")
  ) {
    return "unreachable";
  }

  if (
    errorCode === "AccessDenied" ||
    errorCode === "InvalidAccessKeyId" ||
    errorCode === "SignatureDoesNotMatch" ||
    httpStatusCode === 401 ||
    httpStatusCode === 403
  ) {
    return "auth_failed";
  }

  if (isMissingBucketError(error)) {
    return "bucket_unavailable";
  }

  return "unknown";
}

async function streamToBuffer(body) {
  if (!body) {
    throw new Error("Storage object body is missing.");
  }

  if (typeof body.transformToByteArray === "function") {
    const bytes = await body.transformToByteArray();
    return Buffer.from(bytes);
  }

  const chunks = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}
