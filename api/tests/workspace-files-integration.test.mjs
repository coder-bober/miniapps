import assert from "node:assert/strict";
import { runCase } from "./helpers/test-helpers.mjs";

import { DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

import { buildApiApp } from "../app.mjs";
import { assertApiEnv, getApiConfig } from "../config.mjs";
import { createQueueService } from "../core/queue/service.mjs";
import { generateWorkspaceFileThumbnail } from "../modules/workspace-files/jobs/generate-thumbnail.mjs";
import {
  createStorageClient as createSharedStorageClient,
  createStorageService,
  getStorageConfig,
} from "../services/storage.mjs";
import { createApiServices } from "../services/supabase.mjs";
import { assertTestStorageIsolation } from "../../scripts/assert-test-storage-isolation.mjs";
import { loadEnvFiles } from "../../scripts/load-env.mjs";

assertTestStorageIsolation();
// loadEnvFiles([".env.api.e2e.local", ".env.e2e.local", ".env.api.local", ".env.local"]);
loadEnvFiles([".env.api.e2e.local", ".env.e2e.local"]);
process.env.ENABLED_MODULES = "workspace-files";

const config = assertApiEnv(getApiConfig());
const storageConfig = getStorageConfig(config);

function createPublicClient() {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function createAdminClient() {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function createStorageClient() {
  return createSharedStorageClient(storageConfig);
}


async function createDisposableConfirmedUser() {
  const admin = createAdminClient();
  const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `workspace-integration-${runId}@example.com`;
  const password = `QuietShift!${runId}`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    throw error;
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: data.user.id,
    username: `workspace_${runId.replace(/[^a-z0-9_]/g, "_")}`.slice(0, 30),
    full_name: "Workspace Integration User",
    avatar_url: null,
  });

  if (profileError) {
    throw profileError;
  }

  return {
    id: data.user.id,
    email,
    password,
  };
}

async function deleteUserIfPresent(userId) {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);

  if (error && !error.message.toLowerCase().includes("not found")) {
    throw error;
  }
}

async function createSharedWorkspace({ ownerUserId, slug, name, memberUserIds = [] }) {
  const admin = createAdminClient();
  const workspaceResponse = await admin
    .from("workspaces")
    .insert({
      kind: "shared",
      slug,
      name,
    })
    .select("id, slug, name")
    .single();

  if (workspaceResponse.error) {
    throw workspaceResponse.error;
  }

  const membershipRows = [
    {
      workspace_id: workspaceResponse.data.id,
      user_id: ownerUserId,
      role: "owner",
    },
    ...memberUserIds.map((userId) => ({
      workspace_id: workspaceResponse.data.id,
      user_id: userId,
      role: "member",
    })),
  ];
  const membershipResponse = await admin.from("workspace_memberships").insert(membershipRows);

  if (membershipResponse.error) {
    throw membershipResponse.error;
  }

  return workspaceResponse.data;
}

async function deleteWorkspaceIfPresent(workspaceId) {
  if (!workspaceId) {
    return;
  }

  const admin = createAdminClient();
  const { error } = await admin.from("workspaces").delete().eq("id", workspaceId);

  if (error) {
    throw error;
  }
}

function isTransientAuthResponse(response) {
  if (response.statusCode === 401 && response.body.includes("invalid_session")) {
    return true;
  }

  if (response.statusCode === 500 && response.body.toLowerCase().includes("fetch failed")) {
    return true;
  }

  if (response.statusCode === 503 && response.body.includes("workspace_storage_unreachable")) {
    return true;
  }

  return false;
}

async function injectWithAuthRetry(app, request, maxAttempts = 3) {
  let lastResponse = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await app.inject(request);
    lastResponse = response;

    if (!isTransientAuthResponse(response)) {
      return response;
    }

    if (attempt === maxAttempts) {
      return response;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return lastResponse;
}

async function assertWorkspaceFileSchemaReady() {
  const admin = createAdminClient();
  const { error } = await admin
    .from("workspace_files")
    .select("id, thumbnail_status, thumbnail_error, thumbnail_storage_key")
    .limit(1);

  if (!error) {
    return;
  }

  throw new Error(
    [
      "The workspace_files schema is not ready for thumbnail integration tests.",
      "Apply these SQL patches to the active Supabase project and rerun the test:",
      "- docs/SQL/workspace-files-thumbnails.sql",
      "- docs/SQL/workspace-files-thumbnail-status.sql",
      `Original backend error: ${error.message}`,
    ].join("\n"),
  );
}

async function ensureWorkspaceStorageReady() {
  try {
    await createStorageService(config).ensureBucketExists();
  } catch (error) {
    throw new Error(
      [
        "Workspace storage is not ready for integration tests.",
        `Expected a reachable S3-compatible endpoint at ${storageConfig.storageS3Endpoint} and an accessible bucket "${storageConfig.storageS3Bucket}".`,
        "Start the local SeaweedFS S3 service or fix the storage endpoint credentials, then rerun the test.",
        `Original storage error: ${error instanceof Error ? error.message : String(error)}`,
      ].join("\n"),
    );
  }
}

await assertWorkspaceFileSchemaReady();
await ensureWorkspaceStorageReady();

await runCase(
  "workspace file routes upload, thumbnail, list, and delete against real storage and metadata",
  async () => {
    const user = await createDisposableConfirmedUser();
    const publicClient = createPublicClient();
    const adminClient = createAdminClient();
    const storageClient = createStorageClient();
    const queuedJobs = [];
    const services = {
      ...createApiServices(config),
      ...createQueueService({
        transport: {
          async enqueue(queuedJob) {
            queuedJobs.push(queuedJob);
            return queuedJob;
          },
        },
      }),
      ...createStorageService(config),
    };
    const app = buildApiApp({ services });

    let fileRecord = null;

    try {
      const signInResult = await publicClient.auth.signInWithPassword({
        email: user.email,
        password: user.password,
      });

      assert.equal(signInResult.error, null);
      assert.ok(signInResult.data.session?.access_token);

      const boundary = "----workspace-integration-upload";
      const body = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="workspaceSlug"',
        "",
        "default",
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="notes.txt"',
        "Content-Type: text/plain",
        "",
        "hello integration",
        `--${boundary}--`,
        "",
      ].join("\r\n");

      const uploadResponse = await injectWithAuthRetry(app, {
        method: "POST",
        url: "/v1/workspace/files",
        headers: {
          authorization: `Bearer ${signInResult.data.session.access_token}`,
          "content-type": `multipart/form-data; boundary=${boundary}`,
        },
        payload: body,
      });

      assert.equal(uploadResponse.statusCode, 201);
      const uploadedFile = uploadResponse.json().file;
      assert.equal(uploadedFile.originalName, "notes.txt");
      assert.equal(uploadedFile.thumbnailStatus, "pending");

      const dbRecordResponse = await adminClient
        .from("workspace_files")
        .select("id, storage_bucket, storage_key, thumbnail_status")
        .eq("id", uploadedFile.id)
        .single();

      assert.equal(dbRecordResponse.error, null);
      fileRecord = dbRecordResponse.data;
      assert.equal(fileRecord.thumbnail_status, "pending");

      const headResponse = await storageClient.send(
        new HeadObjectCommand({
          Bucket: fileRecord.storage_bucket,
          Key: fileRecord.storage_key,
        }),
      );

      assert.ok(headResponse.$metadata.httpStatusCode === 200);

      const listResponse = await injectWithAuthRetry(app, {
        method: "GET",
        url: "/v1/workspace/files",
        headers: {
          authorization: `Bearer ${signInResult.data.session.access_token}`,
        },
      });

      assert.equal(listResponse.statusCode, 200);
      assert.equal(listResponse.json().workspace.workspaceSlug, "default");
      assert.equal(listResponse.json().files.length, 1);
      assert.equal(listResponse.json().files[0].thumbnailStatus, "pending");

      const deleteResponse = await injectWithAuthRetry(app, {
        method: "DELETE",
        url: `/v1/workspace/files/${uploadedFile.id}`,
        headers: {
          authorization: `Bearer ${signInResult.data.session.access_token}`,
        },
      });

      assert.equal(deleteResponse.statusCode, 200);
      assert.deepEqual(deleteResponse.json(), { ok: true });

      const missingRecordResponse = await adminClient
        .from("workspace_files")
        .select("id")
        .eq("id", uploadedFile.id)
        .maybeSingle();

      assert.equal(missingRecordResponse.error, null);
      assert.equal(missingRecordResponse.data, null);

      await assert.rejects(
        storageClient.send(
          new HeadObjectCommand({
            Bucket: fileRecord.storage_bucket,
            Key: fileRecord.storage_key,
          }),
        ),
      );

      fileRecord = null;
    } finally {
      if (fileRecord) {
        await storageClient.send(
          new DeleteObjectCommand({
            Bucket: fileRecord.storage_bucket,
            Key: fileRecord.storage_key,
          }),
        );
      }

      await app.close();
      await deleteUserIfPresent(user.id);
    }
  },
);

await runCase(
  "workspace image upload produces thumbnail metadata and thumbnail content",
  async () => {
    const user = await createDisposableConfirmedUser();
    const publicClient = createPublicClient();
    const adminClient = createAdminClient();
    const storageClient = createStorageClient();
    const queuedJobs = [];
    const services = {
      ...createApiServices(config),
      ...createQueueService({
        transport: {
          async enqueue(queuedJob) {
            queuedJobs.push(queuedJob);
            return queuedJob;
          },
        },
      }),
      ...createStorageService(config),
    };
    const app = buildApiApp({ services });

    let fileRecord = null;

    try {
      const signInResult = await publicClient.auth.signInWithPassword({
        email: user.email,
        password: user.password,
      });

      assert.equal(signInResult.error, null);
      assert.ok(signInResult.data.session?.access_token);

      const imageBuffer = await sharp({
        create: {
          width: 8,
          height: 8,
          channels: 3,
          background: {
            r: 34,
            g: 120,
            b: 220,
          },
        },
      })
        .png()
        .toBuffer();
      const boundary = "----workspace-thumbnail-upload";
      const body = Buffer.concat([
        Buffer.from(
          [
            `--${boundary}`,
            'Content-Disposition: form-data; name="workspaceSlug"',
            "",
            "default",
            `--${boundary}`,
            'Content-Disposition: form-data; name="file"; filename="pixel.png"',
            "Content-Type: image/png",
            "",
          ].join("\r\n") + "\r\n",
        ),
        imageBuffer,
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);

      const uploadResponse = await injectWithAuthRetry(app, {
        method: "POST",
        url: "/v1/workspace/files",
        headers: {
          authorization: `Bearer ${signInResult.data.session.access_token}`,
          "content-type": `multipart/form-data; boundary=${boundary}`,
        },
        payload: body,
      });

      assert.equal(uploadResponse.statusCode, 201);
      const uploadedFile = uploadResponse.json().file;
      assert.equal(uploadedFile.originalName, "pixel.png");
      assert.equal(uploadedFile.kind, "image");
      assert.equal(uploadedFile.thumbnailStatus, "pending");
      assert.equal(uploadedFile.thumbnailError, null);
      assert.equal(uploadedFile.thumbnail, null);

      assert.equal(queuedJobs.length, 1);
      assert.equal(queuedJobs[0].jobId, "workspace-files.generate-thumbnail");

      await generateWorkspaceFileThumbnail({
        job: {
          id: "test-thumbnail-job",
          name: queuedJobs[0].jobId,
          data: queuedJobs[0].payload,
        },
        logger: {
          info() {},
        },
        services,
      });

      const dbRecordResponse = await adminClient
        .from("workspace_files")
        .select(
          "id, storage_bucket, storage_key, thumbnail_status, thumbnail_error, thumbnail_storage_key, thumbnail_mime_type, thumbnail_width, thumbnail_height",
        )
        .eq("id", uploadedFile.id)
        .single();

      assert.equal(dbRecordResponse.error, null);
      fileRecord = dbRecordResponse.data;
      assert.equal(fileRecord.thumbnail_status, "completed");
      assert.equal(fileRecord.thumbnail_error, null);
      assert.ok(fileRecord.thumbnail_storage_key);
      assert.equal(fileRecord.thumbnail_mime_type, "image/webp");
      assert.ok(Number.isInteger(fileRecord.thumbnail_width) || fileRecord.thumbnail_width === 1);
      assert.ok(Number.isInteger(fileRecord.thumbnail_height) || fileRecord.thumbnail_height === 1);

      const thumbnailHeadResponse = await storageClient.send(
        new HeadObjectCommand({
          Bucket: fileRecord.storage_bucket,
          Key: fileRecord.thumbnail_storage_key,
        }),
      );

      assert.ok(thumbnailHeadResponse.$metadata.httpStatusCode === 200);

      const listResponse = await injectWithAuthRetry(app, {
        method: "GET",
        url: "/v1/workspace/files",
        headers: {
          authorization: `Bearer ${signInResult.data.session.access_token}`,
        },
      });

      assert.equal(listResponse.statusCode, 200);
      assert.equal(listResponse.json().workspace.workspaceSlug, "default");
      assert.equal(listResponse.json().files.length, 1);
      assert.equal(listResponse.json().files[0].id, uploadedFile.id);
      assert.equal(listResponse.json().files[0].thumbnailStatus, "completed");
      assert.equal(listResponse.json().files[0].thumbnailError, null);
      assert.ok(listResponse.json().files[0].thumbnail);
      assert.equal(listResponse.json().files[0].thumbnail.mimeType, "image/webp");

      const thumbnailResponse = await injectWithAuthRetry(app, {
        method: "GET",
        url: `/v1/workspace/files/${uploadedFile.id}/thumbnail`,
        headers: {
          authorization: `Bearer ${signInResult.data.session.access_token}`,
        },
      });

      assert.equal(thumbnailResponse.statusCode, 200);
      assert.equal(thumbnailResponse.headers["content-type"], "image/webp");
      assert.ok(thumbnailResponse.rawPayload.length > 0);

      const deleteResponse = await injectWithAuthRetry(app, {
        method: "DELETE",
        url: `/v1/workspace/files/${uploadedFile.id}`,
        headers: {
          authorization: `Bearer ${signInResult.data.session.access_token}`,
        },
      });

      assert.equal(deleteResponse.statusCode, 200);
      assert.deepEqual(deleteResponse.json(), { ok: true });

      await assert.rejects(
        storageClient.send(
          new HeadObjectCommand({
            Bucket: fileRecord.storage_bucket,
            Key: fileRecord.storage_key,
          }),
        ),
      );

      await assert.rejects(
        storageClient.send(
          new HeadObjectCommand({
            Bucket: fileRecord.storage_bucket,
            Key: fileRecord.thumbnail_storage_key,
          }),
        ),
      );

      fileRecord = null;
    } finally {
      if (fileRecord?.storage_key) {
        await storageClient
          .send(
            new DeleteObjectCommand({
              Bucket: fileRecord.storage_bucket,
              Key: fileRecord.storage_key,
            }),
          )
          .catch(() => {});
      }

      if (fileRecord?.thumbnail_storage_key) {
        await storageClient
          .send(
            new DeleteObjectCommand({
              Bucket: fileRecord.storage_bucket,
              Key: fileRecord.thumbnail_storage_key,
            }),
          )
          .catch(() => {});
      }

      await app.close();
      await deleteUserIfPresent(user.id);
    }
  },
);

await runCase(
  "workspace file routes honor shared workspace membership via workspaceId",
  async () => {
    const owner = await createDisposableConfirmedUser();
    const member = await createDisposableConfirmedUser();
    const outsider = await createDisposableConfirmedUser();
    const publicClient = createPublicClient();
    const adminClient = createAdminClient();
    const storageClient = createStorageClient();
    const services = {
      ...createApiServices(config),
      ...createQueueService({
        transport: {
          async enqueue(queuedJob) {
            return queuedJob;
          },
        },
      }),
      ...createStorageService(config),
    };
    const app = buildApiApp({ services });
    const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    let sharedWorkspace = null;
    let fileRecord = null;

    try {
      sharedWorkspace = await createSharedWorkspace({
        ownerUserId: owner.id,
        memberUserIds: [member.id],
        slug: `shared-${runId}`.slice(0, 64),
        name: `Shared Workspace ${runId}`,
      });

      const memberSignIn = await publicClient.auth.signInWithPassword({
        email: member.email,
        password: member.password,
      });

      assert.equal(memberSignIn.error, null);
      assert.ok(memberSignIn.data.session?.access_token);

      const ownerSignIn = await publicClient.auth.signInWithPassword({
        email: owner.email,
        password: owner.password,
      });

      assert.equal(ownerSignIn.error, null);
      assert.ok(ownerSignIn.data.session?.access_token);

      const boundary = "----workspace-shared-upload";
      const body = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="workspaceId"',
        "",
        sharedWorkspace.id,
        `--${boundary}`,
        'Content-Disposition: form-data; name="workspaceSlug"',
        "",
        sharedWorkspace.slug,
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="shared.txt"',
        "Content-Type: text/plain",
        "",
        "hello shared workspace",
        `--${boundary}--`,
        "",
      ].join("\r\n");

      const uploadResponse = await injectWithAuthRetry(app, {
        method: "POST",
        url: "/v1/workspace/files",
        headers: {
          authorization: `Bearer ${memberSignIn.data.session.access_token}`,
          "content-type": `multipart/form-data; boundary=${boundary}`,
        },
        payload: body,
      });

      assert.equal(uploadResponse.statusCode, 201);
      const uploadedFile = uploadResponse.json().file;
      assert.equal(uploadedFile.workspaceId, sharedWorkspace.id);
      assert.equal(uploadedFile.workspaceSlug, sharedWorkspace.slug);

      const dbRecordResponse = await adminClient
        .from("workspace_files")
        .select("id, workspace_id, workspace_slug, storage_bucket, storage_key")
        .eq("id", uploadedFile.id)
        .single();

      assert.equal(dbRecordResponse.error, null);
      fileRecord = dbRecordResponse.data;
      assert.equal(fileRecord.workspace_id, sharedWorkspace.id);
      assert.equal(fileRecord.workspace_slug, sharedWorkspace.slug);

      const listResponse = await injectWithAuthRetry(app, {
        method: "GET",
        url: `/v1/workspace/files?workspaceId=${encodeURIComponent(sharedWorkspace.id)}&workspaceSlug=${encodeURIComponent(sharedWorkspace.slug)}`,
        headers: {
          authorization: `Bearer ${memberSignIn.data.session.access_token}`,
        },
      });

      assert.equal(listResponse.statusCode, 200);
      assert.equal(listResponse.json().workspace.workspaceId, sharedWorkspace.id);
      assert.equal(listResponse.json().workspace.workspaceSlug, sharedWorkspace.slug);
      assert.equal(listResponse.json().files.length, 1);
      assert.equal(listResponse.json().files[0].id, uploadedFile.id);

      const outsiderSignIn = await publicClient.auth.signInWithPassword({
        email: outsider.email,
        password: outsider.password,
      });

      assert.equal(outsiderSignIn.error, null);
      assert.ok(outsiderSignIn.data.session?.access_token);

      const outsiderListResponse = await injectWithAuthRetry(app, {
        method: "GET",
        url: `/v1/workspace/files?workspaceId=${encodeURIComponent(sharedWorkspace.id)}&workspaceSlug=${encodeURIComponent(sharedWorkspace.slug)}`,
        headers: {
          authorization: `Bearer ${outsiderSignIn.data.session.access_token}`,
        },
      });

      assert.equal(outsiderListResponse.statusCode, 403);
      assert.equal(outsiderListResponse.json().error, "module_capability_required");
      assert.equal(outsiderListResponse.json().requiredCapability, "workspace-files.read");

      const memberDeleteResponse = await injectWithAuthRetry(app, {
        method: "DELETE",
        url: `/v1/workspace/files/${uploadedFile.id}`,
        headers: {
          authorization: `Bearer ${memberSignIn.data.session.access_token}`,
        },
      });

      assert.equal(memberDeleteResponse.statusCode, 403);
      assert.equal(memberDeleteResponse.json().error, "module_capability_required");
      assert.equal(memberDeleteResponse.json().requiredCapability, "workspace-files.delete");

      const deleteResponse = await injectWithAuthRetry(app, {
        method: "DELETE",
        url: `/v1/workspace/files/${uploadedFile.id}`,
        headers: {
          authorization: `Bearer ${ownerSignIn.data.session.access_token}`,
        },
      });

      assert.equal(deleteResponse.statusCode, 200);
      assert.deepEqual(deleteResponse.json(), { ok: true });

      await assert.rejects(
        storageClient.send(
          new HeadObjectCommand({
            Bucket: fileRecord.storage_bucket,
            Key: fileRecord.storage_key,
          }),
        ),
      );

      fileRecord = null;
    } finally {
      if (fileRecord?.storage_key) {
        await storageClient
          .send(
            new DeleteObjectCommand({
              Bucket: fileRecord.storage_bucket,
              Key: fileRecord.storage_key,
            }),
          )
          .catch(() => {});
      }

      await app.close();
      await deleteWorkspaceIfPresent(sharedWorkspace?.id ?? null);
      await deleteUserIfPresent(owner.id);
      await deleteUserIfPresent(member.id);
      await deleteUserIfPresent(outsider.id);
    }
  },
);
