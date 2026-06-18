#!/usr/bin/env node

import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import Redis from "ioredis";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import defaultConfig from "./config.mjs";
import { loadEnvFiles } from "../../load-env.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const args = new Set(process.argv.slice(2));

function resolveProjectPath(projectRoot, value) {
  return path.isAbsolute(value) ? value : path.join(projectRoot, value);
}

function normalizeConfig(config) {
  const projectRoot = config.projectRoot ?? path.resolve(scriptDir, "../../../");

  return {
    ...config,
    projectRoot,
    useEnv: config.useEnv ?? [],
    useSqlFiles: config.useSqlFiles ?? [],
    sql: {
      enabled: true,
      required: false,
      method: "auto",
      rpcName: "exec_sql",
      rpcSqlArgument: "sql",
      metaPath: "/pg/meta/query",
      ...(config.sql ?? {}),
    },
    dataReset: {
      enabled: true,
      publicTables: [
        "workspace_module_roles",
        "workspace_memberships",
        "workspaces",
        "user_module_roles",
        "workspace_files",
        "profiles",
      ],
      ...(config.dataReset ?? {}),
    },
    storage: {
      enabled: true,
      bucketsFromEnv: ["STORAGE_S3_BUCKET"],
      listPageSize: 100,
      ...(config.storage ?? {}),
    },
    redis: {
      enabled: true,
      mode: "flushdb",
      ...(config.redis ?? {}),
    },
    logFile: config.logFile ?? "last-run.json",
  };
}

async function loadConfig() {
  const explicitConfigArg = process.argv
    .slice(2)
    .find((arg) => arg.startsWith("--config="));

  if (!explicitConfigArg) {
    return normalizeConfig(defaultConfig);
  }

  const configPath = resolveProjectPath(
    path.resolve(scriptDir, "../../../"),
    explicitConfigArg.slice("--config=".length),
  );
  const module = await import(pathToFileURL(configPath).href);
  return normalizeConfig(module.default ?? module);
}

function requireEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable ${name}.`);
  }

  return value;
}

function parseOptionalJson(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function isMissingTableError(error) {
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    error?.message?.includes("Could not find the table")
  );
}

function getStorageClient() {
  const endpoint = requireEnv("STORAGE_S3_ENDPOINT").replace(/\/+$/, "");
  const region = requireEnv("STORAGE_S3_REGION");
  const accessKeyId = requireEnv("STORAGE_S3_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("STORAGE_S3_SECRET_ACCESS_KEY");
  const forcePathStyle =
    process.env.STORAGE_S3_FORCE_PATH_STYLE === undefined
      ? true
      : process.env.STORAGE_S3_FORCE_PATH_STYLE === "true";

  return new S3Client({
    endpoint,
    region,
    forcePathStyle,
    maxAttempts: 1,
    requestHandler: new NodeHttpHandler({
      connectionTimeout: 3_000,
      requestTimeout: 10_000,
      throwOnRequestTimeout: true,
    }),
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

function getSupabaseAdminClient() {
  return createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function resolveBasicAuth(config) {
  const explicitAuth =
    config.sql.basicAuth ??
    process.env.SUPABASE_SQL_BASIC_AUTH ??
    process.env.SUPABASE_META_BASIC_AUTH ??
    "";

  if (explicitAuth) {
    return explicitAuth.startsWith("Basic ")
      ? explicitAuth
      : `Basic ${Buffer.from(explicitAuth).toString("base64")}`;
  }

  const username =
    config.sql.basicAuthUsername ??
    process.env.SUPABASE_SQL_BASIC_AUTH_USERNAME ??
    process.env.SUPABASE_META_BASIC_AUTH_USERNAME ??
    process.env.DASHBOARD_USERNAME;
  const password =
    config.sql.basicAuthPassword ??
    process.env.SUPABASE_SQL_BASIC_AUTH_PASSWORD ??
    process.env.SUPABASE_META_BASIC_AUTH_PASSWORD ??
    process.env.DASHBOARD_PASSWORD;

  if (!username || !password) {
    return null;
  }

  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

async function runSqlViaMeta({ sql, file, config }) {
  const basicAuth = resolveBasicAuth(config);

  if (!basicAuth) {
    return {
      skipped: true,
      reason: "SQL metadata endpoint requires Basic auth credentials.",
    };
  }

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL").replace(/\/+$/, "");
  const response = await fetch(`${supabaseUrl}${config.sql.metaPath}`, {
    method: "POST",
    headers: {
      authorization: basicAuth,
      "content-type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      [
        `SQL file failed through pg-meta: ${file}`,
        `HTTP ${response.status}`,
        body,
      ].join("\n"),
    );
  }

  return {
    skipped: false,
    response: parseOptionalJson(body),
  };
}

async function runSqlViaRpc({ sql, file, config }) {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL").replace(/\/+$/, "");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/${encodeURIComponent(config.sql.rpcName)}`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        [config.sql.rpcSqlArgument]: sql,
      }),
    },
  );
  const body = await response.text();

  if (!response.ok) {
    if (response.status === 404) {
      return {
        skipped: true,
        reason: `RPC ${config.sql.rpcName} is not available.`,
      };
    }

    throw new Error([`SQL file failed through RPC: ${file}`, `HTTP ${response.status}`, body].join("\n"));
  }

  return {
    skipped: false,
    response: parseOptionalJson(body),
  };
}

async function runSqlFile({ file, config }) {
  if (!config.sql.enabled) {
    return {
      file,
      skipped: true,
      reason: "SQL execution disabled by config.",
    };
  }

  const sql = await readFile(file, "utf8");
  const methods =
    config.sql.method === "meta"
      ? ["meta"]
      : config.sql.method === "rpc"
        ? ["rpc"]
        : ["meta", "rpc"];
  const skipped = [];

  for (const method of methods) {
    const result =
      method === "meta"
        ? await runSqlViaMeta({ sql, file, config })
        : await runSqlViaRpc({ sql, file, config });

    if (!result.skipped) {
      return {
        file,
        ok: true,
        method,
        response: result.response,
      };
    }

    skipped.push(`${method}: ${result.reason}`);
  }

  if (config.sql.required) {
    throw new Error(
      [
        `SQL file could not be executed: ${file}`,
        ...skipped,
      ].join("\n"),
    );
  }

  return {
    file,
    skipped: true,
    reason: skipped.join("; "),
  };
}

async function deleteAuthUsers(supabase) {
  const perPage = 1000;
  let deleted = 0;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage,
    });

    if (error) {
      throw error;
    }

    const users = data.users ?? [];

    if (users.length === 0) {
      break;
    }

    console.log(`Deleting ${users.length} auth user(s)...`);

    for (const user of users) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

      if (deleteError && !deleteError.message.toLowerCase().includes("not found")) {
        throw deleteError;
      }

      deleted += 1;
    }
  }

  return deleted;
}

async function deletePublicTableRows(supabase, table) {
  const { error, count } = await supabase
    .from(table)
    .delete({ count: "exact" })
    .not("created_at", "is", null);

  if (!error) {
    return { table, deleted: count ?? null };
  }

  if (isMissingTableError(error)) {
    return { table, skipped: true, reason: "table does not exist" };
  }

  const fallback = await supabase
    .from(table)
    .delete({ count: "exact" })
    .not("id", "is", null);

  if (isMissingTableError(fallback.error)) {
    return { table, skipped: true, reason: "table does not exist" };
  }

  if (fallback.error) {
    throw fallback.error;
  }

  return { table, deleted: fallback.count ?? null };
}

async function resetSupabaseData(config) {
  if (!config.dataReset.enabled) {
    return { skipped: true, reason: "disabled" };
  }

  const supabase = getSupabaseAdminClient();
  const tables = [];

  for (const table of config.dataReset.publicTables) {
    console.log(`Clearing table ${table}...`);
    tables.push(await deletePublicTableRows(supabase, table));
  }

  console.log("Clearing auth users...");

  return {
    skipped: false,
    publicTables: tables,
    authUsersDeleted: await deleteAuthUsers(supabase),
  };
}

async function clearBucket({ bucket, client, pageSize }) {
  let deleted = 0;
  let continuationToken;
  const maxKeys = Math.max(1, Math.min(Number(pageSize) || 100, 1000));

  do {
    const listResponse = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        MaxKeys: maxKeys,
        ContinuationToken: continuationToken,
      }),
    );
    const objects = listResponse.Contents ?? [];

    if (objects.length > 0) {
      const deleteResponse = await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: objects
              .map((object) => object.Key)
              .filter(Boolean)
              .map((Key) => ({ Key })),
            Quiet: true,
          },
        }),
      );

      if (deleteResponse.Errors?.length) {
        throw new Error(
          `Failed to delete ${deleteResponse.Errors.length} object(s) from ${bucket}.`,
        );
      }

      deleted += objects.length;
      console.log(`Deleted ${deleted} object(s) from ${bucket}...`);
    }

    continuationToken = listResponse.IsTruncated
      ? listResponse.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return { bucket, deleted };
}

async function clearStorage(config) {
  if (!config.storage.enabled) {
    return { skipped: true, reason: "disabled" };
  }

  const buckets = [
    ...(config.storage.buckets ?? []),
    ...config.storage.bucketsFromEnv
      .map((name) => process.env[name]?.trim())
      .filter(Boolean),
  ];
  const uniqueBuckets = [...new Set(buckets)];

  if (uniqueBuckets.length === 0) {
    return { skipped: true, reason: "no buckets configured" };
  }

  const client = getStorageClient();
  const results = [];

  try {
    for (const bucket of uniqueBuckets) {
      console.log(`Clearing storage bucket ${bucket}...`);
      results.push(await clearBucket({ bucket, client, pageSize: config.storage.listPageSize }));
    }
  } finally {
    client.destroy();
  }

  return { skipped: false, buckets: results };
}

async function clearRedis(config) {
  if (!config.redis.enabled) {
    return { skipped: true, reason: "disabled" };
  }

  const redisUrl = process.env.REDIS_URL?.trim();

  if (!redisUrl) {
    return { skipped: true, reason: "REDIS_URL is not configured" };
  }

  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    connectTimeout: 5_000,
    commandTimeout: 10_000,
  });

  try {
    console.log("Clearing Redis...");
    await redis.connect();

    if (config.redis.mode === "flushall") {
      await redis.flushall();
      return { skipped: false, mode: "flushall" };
    }

    await redis.flushdb();
    return { skipped: false, mode: "flushdb" };
  } finally {
    redis.disconnect();
  }
}

function summarizeError(error) {
  return {
    name: error?.name ?? "Error",
    message: error?.message ?? String(error),
    stack: error?.stack ?? null,
  };
}

async function writeRunLog(config, log) {
  const logPath = resolveProjectPath(scriptDir, config.logFile);
  await mkdir(path.dirname(logPath), { recursive: true });
  await writeFile(logPath, `${JSON.stringify(log, null, 2)}\n`, "utf8");
  return logPath;
}

async function main() {
  const config = await loadConfig();
  const startedAt = new Date().toISOString();
  const log = {
    startedAt,
    finishedAt: null,
    ok: false,
    config: {
      useEnv: config.useEnv,
      useSqlFiles: config.useSqlFiles,
      storage: config.storage,
      redis: config.redis,
      dataReset: config.dataReset,
    },
    steps: [],
  };

  try {
    if (!args.has("--yes")) {
      throw new Error("Refusing to reset data without --yes.");
    }

    loadEnvFiles(
      config.useEnv.map((file) => resolveProjectPath(config.projectRoot, file)),
      { override: true },
    );

    requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    const sqlSteps = [];

    for (const sqlFile of config.useSqlFiles) {
      const file = resolveProjectPath(config.projectRoot, sqlFile);
      sqlSteps.push({
        type: "sql",
        ...(await runSqlFile({ file, config })),
      });
    }

    log.steps.push(...sqlSteps);

    if (sqlSteps.some((step) => step.skipped)) {
      log.steps.push({
        type: "supabase-data",
        ...(await resetSupabaseData(config)),
      });
    }

    log.steps.push({
      type: "storage",
      ...(await clearStorage(config)),
    });
    log.steps.push({
      type: "redis",
      ...(await clearRedis(config)),
    });

    log.ok = true;
  } catch (error) {
    log.error = summarizeError(error);
  } finally {
    log.finishedAt = new Date().toISOString();
    const logPath = await writeRunLog(config, log);

    if (log.ok) {
      console.log(`Reset completed. Last-run log: ${logPath}`);
    } else {
      console.error(`Reset failed. Last-run log: ${logPath}`);
      console.error(log.error?.message ?? "Unknown error");
      process.exitCode = 1;
    }
  }
}

await main();
