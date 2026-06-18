#!/usr/bin/env node

import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import defaultConfig from "./config.mjs";
import { loadEnvFiles } from "../../load-env.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const command = argv.find((arg) => !arg.startsWith("--")) ?? "save";
const args = new Set(argv.filter((arg) => arg.startsWith("--")));

function getArgValue(name) {
  return argv.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1) ?? null;
}

function resolveProjectPath(projectRoot, value) {
  return path.isAbsolute(value) ? value : path.join(projectRoot, value);
}

function normalizeConfig(config) {
  const projectRoot = config.projectRoot ?? path.resolve(scriptDir, "../../../");

  return {
    ...config,
    projectRoot,
    useEnv: config.useEnv ?? [],
    snapshotsDir: config.snapshotsDir ?? "scripts/admin-utils/data_snapshots/snapshots",
    logFile: config.logFile ?? "last-run.json",
    auth: {
      enabled: true,
      file: "auth-users.json",
      restoreUsers: true,
      restorePassword: "RestoredSnapshot!ChangeMe1",
      ...(config.auth ?? {}),
    },
    tables: config.tables ?? [],
    restore: {
      deleteOrder: [...(config.tables ?? []).map((table) => table.name)].reverse(),
      insertOrder: (config.tables ?? []).map((table) => table.name),
      ...(config.restore ?? {}),
    },
    storage: {
      enabled: true,
      bucketsFromEnv: ["STORAGE_S3_BUCKET"],
      listPageSize: 100,
      saveObjectBodies: false,
      ...(config.storage ?? {}),
    },
  };
}

async function loadConfig() {
  const explicitConfigArg = argv.find((arg) => arg.startsWith("--config="));

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

function getSupabaseAdminClient() {
  return createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
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

function localTimestamp(date = new Date()) {
  const parts = [
    date.getFullYear(),
    "-",
    String(date.getMonth() + 1).padStart(2, "0"),
    "-",
    String(date.getDate()).padStart(2, "0"),
    "_",
    String(date.getHours()).padStart(2, "0"),
    "-",
    String(date.getMinutes()).padStart(2, "0"),
    "-",
    String(date.getSeconds()).padStart(2, "0"),
  ];

  return parts.join("");
}

function sortJson(value) {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortJson(value[key])]),
    );
  }

  return value;
}

function compareValues(left, right) {
  if (left === right) {
    return 0;
  }

  if (left === null || left === undefined) {
    return -1;
  }

  if (right === null || right === undefined) {
    return 1;
  }

  return String(left).localeCompare(String(right));
}

function sortRows(rows, orderBy = []) {
  const fields = orderBy.length > 0 ? orderBy : ["id", "created_at"];

  return [...rows].sort((left, right) => {
    for (const field of fields) {
      const result = compareValues(left[field], right[field]);

      if (result !== 0) {
        return result;
      }
    }

    return JSON.stringify(sortJson(left)).localeCompare(JSON.stringify(sortJson(right)));
  });
}

async function writeJson(file, data) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(sortJson(data), null, 2)}\n`, "utf8");
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function fetchAllRows(supabase, table) {
  const pageSize = 1000;
  const rows = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table.name)
      .select("*")
      .range(from, from + pageSize - 1);

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        return { skipped: true, reason: "table does not exist", rows: [] };
      }

      throw error;
    }

    rows.push(...(data ?? []));

    if (!data || data.length < pageSize) {
      break;
    }
  }

  return { skipped: false, rows: sortRows(rows, table.orderBy) };
}

async function listAuthUsers(supabase) {
  const users = [];
  const perPage = 1000;

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw error;
    }

    users.push(...(data.users ?? []));

    if (!data.users || data.users.length < perPage) {
      break;
    }
  }

  return sortRows(
    users.map((user) => ({
      id: user.id,
      aud: user.aud,
      role: user.role,
      email: user.email ?? null,
      phone: user.phone ?? null,
      app_metadata: user.app_metadata ?? {},
      user_metadata: user.user_metadata ?? {},
      created_at: user.created_at ?? null,
      updated_at: user.updated_at ?? null,
      email_confirmed_at: user.email_confirmed_at ?? null,
      phone_confirmed_at: user.phone_confirmed_at ?? null,
      banned_until: user.banned_until ?? null,
    })),
    ["email", "id"],
  );
}

function getStorageBuckets(config) {
  return [
    ...(config.storage.buckets ?? []),
    ...config.storage.bucketsFromEnv
      .map((name) => process.env[name]?.trim())
      .filter(Boolean),
  ].filter((bucket, index, buckets) => bucket && buckets.indexOf(bucket) === index);
}

async function streamToBuffer(body) {
  if (!body) {
    return Buffer.alloc(0);
  }

  if (typeof body.transformToByteArray === "function") {
    return Buffer.from(await body.transformToByteArray());
  }

  const chunks = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

function storageBodyPath(bucket, key) {
  return path.join(
    "storage",
    bucket,
    `${key.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/")}.base64`,
  );
}

async function snapshotStorage(config, snapshotDir) {
  if (!config.storage.enabled) {
    return { skipped: true, reason: "disabled" };
  }

  const buckets = getStorageBuckets(config);

  if (buckets.length === 0) {
    return { skipped: true, reason: "no buckets configured" };
  }

  const client = getStorageClient();
  const results = [];
  const maxKeys = Math.max(1, Math.min(Number(config.storage.listPageSize) || 100, 1000));

  try {
    for (const bucket of buckets) {
      let continuationToken;
      const objects = [];

      do {
        const response = await client.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            MaxKeys: maxKeys,
            ContinuationToken: continuationToken,
          }),
        );

        for (const object of response.Contents ?? []) {
          if (!object.Key) {
            continue;
          }

          const item = {
            key: object.Key,
            size: object.Size ?? null,
            etag: object.ETag ?? null,
            lastModified: object.LastModified?.toISOString() ?? null,
          };

          if (config.storage.saveObjectBodies) {
            const bodyResponse = await client.send(
              new GetObjectCommand({
                Bucket: bucket,
                Key: object.Key,
              }),
            );
            const body = await streamToBuffer(bodyResponse.Body);
            item.bodyFile = storageBodyPath(bucket, object.Key);
            await mkdir(path.dirname(path.join(snapshotDir, item.bodyFile)), { recursive: true });
            await writeFile(path.join(snapshotDir, item.bodyFile), `${body.toString("base64")}\n`, "utf8");
          }

          objects.push(item);
        }

        continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
      } while (continuationToken);

      const sortedObjects = sortRows(objects, ["key"]);
      await writeJson(path.join(snapshotDir, "storage", `${bucket}.json`), sortedObjects);
      results.push({ bucket, objects: sortedObjects.length });
    }
  } finally {
    client.destroy();
  }

  return { skipped: false, buckets: results };
}

async function saveSnapshot(config) {
  const supabase = getSupabaseAdminClient();
  const snapshotName = getArgValue("--name") ?? localTimestamp();
  const snapshotDir = resolveProjectPath(config.projectRoot, path.join(config.snapshotsDir, snapshotName));
  const steps = [];

  await mkdir(snapshotDir, { recursive: true });

  const manifest = {
    name: snapshotName,
    createdAt: new Date().toISOString(),
    localCreatedAt: snapshotName,
    envFiles: config.useEnv,
    tables: config.tables.map((table) => table.name),
    auth: config.auth.enabled,
    storage: config.storage.enabled,
  };
  await writeJson(path.join(snapshotDir, "manifest.json"), manifest);

  if (config.auth.enabled) {
    const users = await listAuthUsers(supabase);
    await writeJson(path.join(snapshotDir, config.auth.file), users);
    steps.push({ type: "auth", users: users.length });
  }

  for (const table of config.tables) {
    const result = await fetchAllRows(supabase, table);
    const file = path.join(snapshotDir, "tables", `${table.name}.json`);
    await writeJson(file, result.rows);
    steps.push({ type: "table", table: table.name, rows: result.rows.length, skipped: result.skipped ?? false });
  }

  steps.push({ type: "storage", ...(await snapshotStorage(config, snapshotDir)) });

  return { snapshotName, snapshotDir, steps };
}

async function deleteTableRows(supabase, table) {
  const { error, count } = await supabase
    .from(table)
    .delete({ count: "exact" })
    .not("id", "is", null);

  if (!error) {
    return { table, deleted: count ?? null };
  }

  if (error.code === "42P01" || error.code === "PGRST205") {
    return { table, skipped: true, reason: "table does not exist" };
  }

  throw error;
}

async function deleteAuthUsers(supabase) {
  let deleted = 0;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (error) {
      throw error;
    }

    const users = data.users ?? [];

    if (users.length === 0) {
      break;
    }

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

async function restoreAuthUsers(supabase, config, snapshotDir) {
  if (!config.auth.enabled || !config.auth.restoreUsers) {
    return { skipped: true, reason: "disabled" };
  }

  const users = await readJson(path.join(snapshotDir, config.auth.file));
  const restored = [];

  for (const user of users) {
    const { data, error } = await supabase.auth.admin.createUser({
      id: user.id,
      email: user.email ?? undefined,
      phone: user.phone ?? undefined,
      password: config.auth.restorePassword,
      email_confirm: Boolean(user.email_confirmed_at),
      phone_confirm: Boolean(user.phone_confirmed_at),
      app_metadata: user.app_metadata ?? {},
      user_metadata: user.user_metadata ?? {},
      role: user.role ?? "authenticated",
    });

    if (error) {
      throw error;
    }

    restored.push(data.user?.id ?? user.id);
  }

  return { skipped: false, users: restored.length };
}

function findTableConfig(config, tableName) {
  return config.tables.find((table) => table.name === tableName) ?? { name: tableName };
}

async function restoreTable(supabase, config, snapshotDir, tableName) {
  const table = findTableConfig(config, tableName);
  const rows = await readJson(path.join(snapshotDir, "tables", `${tableName}.json`));

  if (rows.length === 0) {
    return { table: tableName, rows: 0 };
  }

  const batchSize = 500;
  const onConflict = table.conflictColumns?.join(",");

  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    const response = onConflict
      ? await supabase.from(tableName).upsert(batch, { onConflict })
      : await supabase.from(tableName).insert(batch);

    if (response.error) {
      throw response.error;
    }
  }

  return { table: tableName, rows: rows.length };
}

async function restoreStorage(config, snapshotDir) {
  if (!config.storage.enabled || !config.storage.saveObjectBodies) {
    return { skipped: true, reason: "object bodies were not saved" };
  }

  const client = getStorageClient();
  const results = [];

  try {
    for (const bucket of getStorageBuckets(config)) {
      const objects = await readJson(path.join(snapshotDir, "storage", `${bucket}.json`));
      let restored = 0;

      for (const object of objects) {
        if (!object.bodyFile) {
          continue;
        }

        const body = Buffer.from((await readFile(path.join(snapshotDir, object.bodyFile), "utf8")).trim(), "base64");
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: object.key,
            Body: body,
          }),
        );
        restored += 1;
      }

      results.push({ bucket, restored });
    }
  } finally {
    client.destroy();
  }

  return { skipped: false, buckets: results };
}

async function restoreSnapshot(config) {
  if (!args.has("--yes")) {
    throw new Error("Refusing to restore a snapshot without --yes.");
  }

  const snapshotName = getArgValue("--snapshot") ?? getArgValue("--name");

  if (!snapshotName) {
    throw new Error("Provide --snapshot=<snapshot-folder-name>.");
  }

  const supabase = getSupabaseAdminClient();
  const snapshotDir = resolveProjectPath(config.projectRoot, path.join(config.snapshotsDir, snapshotName));
  const steps = [];

  for (const table of config.restore.deleteOrder) {
    steps.push({ type: "delete-table", ...(await deleteTableRows(supabase, table)) });
  }

  if (config.auth.enabled && config.auth.restoreUsers) {
    steps.push({ type: "delete-auth", users: await deleteAuthUsers(supabase) });
    steps.push({ type: "restore-auth", ...(await restoreAuthUsers(supabase, config, snapshotDir)) });
  }

  for (const table of config.restore.insertOrder) {
    steps.push({ type: "restore-table", ...(await restoreTable(supabase, config, snapshotDir, table)) });
  }

  steps.push({ type: "restore-storage", ...(await restoreStorage(config, snapshotDir)) });

  return { snapshotName, snapshotDir, steps };
}

async function listSnapshots(config) {
  const snapshotsDir = resolveProjectPath(config.projectRoot, config.snapshotsDir);
  const entries = await readdir(snapshotsDir, { withFileTypes: true }).catch(() => []);
  const snapshots = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const snapshot of snapshots) {
    console.log(snapshot);
  }

  return { snapshots };
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
  await writeJson(logPath, log);
  return logPath;
}

async function main() {
  const config = await loadConfig();
  const log = {
    command,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    ok: false,
    steps: [],
  };

  try {
    if (command !== "list") {
      loadEnvFiles(
        config.useEnv.map((file) => resolveProjectPath(config.projectRoot, file)),
        { override: true },
      );
      requireEnv("NEXT_PUBLIC_SUPABASE_URL");
      requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    }

    if (command === "save") {
      Object.assign(log, await saveSnapshot(config));
    } else if (command === "restore") {
      Object.assign(log, await restoreSnapshot(config));
    } else if (command === "list") {
      Object.assign(log, await listSnapshots(config));
    } else {
      throw new Error(`Unknown command: ${command}. Expected save, restore, or list.`);
    }

    log.ok = true;
  } catch (error) {
    log.error = summarizeError(error);
  } finally {
    log.finishedAt = new Date().toISOString();
    const logPath = await writeRunLog(config, log);

    if (log.ok) {
      console.log(`Snapshot ${command} completed. Last-run log: ${logPath}`);
      if (log.snapshotName) {
        console.log(`Snapshot: ${log.snapshotName}`);
      }
    } else {
      console.error(`Snapshot ${command} failed. Last-run log: ${logPath}`);
      console.error(log.error?.message ?? "Unknown error");
      process.exitCode = 1;
    }
  }
}

await main();
