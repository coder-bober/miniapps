export function getApiConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const port = Number(process.env.API_PORT ?? "8787");
  const storageS3Endpoint = process.env.STORAGE_S3_ENDPOINT;
  const storageS3Region = process.env.STORAGE_S3_REGION;
  const storageS3Bucket = process.env.STORAGE_S3_BUCKET;
  const storageS3AccessKeyId = process.env.STORAGE_S3_ACCESS_KEY_ID;
  const storageS3SecretAccessKey = process.env.STORAGE_S3_SECRET_ACCESS_KEY;
  const storageS3PublicBaseUrl = process.env.STORAGE_S3_PUBLIC_BASE_URL;
  const storageS3ForcePathStyle =
    process.env.STORAGE_S3_FORCE_PATH_STYLE === undefined
      ? true
      : process.env.STORAGE_S3_FORCE_PATH_STYLE === "true";
  const storageS3EnsureBucketOnStart =
    process.env.STORAGE_S3_ENSURE_BUCKET_ON_START === undefined
      ? process.env.NODE_ENV !== "production"
      : process.env.STORAGE_S3_ENSURE_BUCKET_ON_START === "true";
  const redisUrl = process.env.REDIS_URL;
  const redisMaxRetriesPerRequest =
    process.env.REDIS_MAX_RETRIES_PER_REQUEST === undefined
      ? null
      : process.env.REDIS_MAX_RETRIES_PER_REQUEST === "null"
        ? null
        : Number(process.env.REDIS_MAX_RETRIES_PER_REQUEST);
  const workspaceRbacStrict = process.env.WORKSPACE_RBAC_STRICT !== "false";

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    port,
    storageS3Endpoint,
    storageS3Region,
    storageS3Bucket,
    storageS3AccessKeyId,
    storageS3SecretAccessKey,
    storageS3PublicBaseUrl,
    storageS3ForcePathStyle,
    storageS3EnsureBucketOnStart,
    redisUrl,
    redisMaxRetriesPerRequest,
    workspaceRbacStrict,
  };
}

export function assertApiEnv(config = getApiConfig()) {
  if (!config.supabaseUrl || !config.supabaseAnonKey || !config.supabaseServiceRoleKey) {
    throw new Error(
      "Missing API environment variables. Expected NEXT_PUBLIC_SUPABASE_URL, a Supabase publishable/anon key, and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return config;
}
