import { z } from "zod";

export const workspaceFileKindSchema = z.enum(["image", "document", "other"]);
export const workspaceSlugSchema = z.string().trim().min(1).max(64).regex(/^[a-z0-9_-]+$/);
export const workspaceIdSchema = z.string().trim().min(1);
export const workspaceFileCapabilitySchema = z.enum([
  "workspace-files.read",
  "workspace-files.upload",
  "workspace-files.delete",
]);
export const workspaceFileThumbnailStatusSchema = z.enum([
  "pending",
  "completed",
  "skipped",
  "failed",
]);

export const workspaceFileSchema = z.object({
  id: z.string(),
  workspaceId: z.string().nullable().optional(),
  workspaceSlug: workspaceSlugSchema,
  originalName: z.string(),
  storedName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  kind: workspaceFileKindSchema,
  createdAt: z.string(),
  thumbnailStatus: workspaceFileThumbnailStatusSchema.nullable(),
  thumbnailError: z.string().nullable(),
  thumbnail: z
    .object({
      mimeType: z.string(),
      width: z.number().int().positive().nullable(),
      height: z.number().int().positive().nullable(),
      createdAt: z.string(),
      path: z.string(),
    })
    .nullable(),
});

export const workspaceFileListRequestSchema = z.object({
  workspaceSlug: workspaceSlugSchema.default("default"),
  workspaceId: workspaceIdSchema.optional(),
});

export const workspaceContextSchema = z.object({
  workspaceId: workspaceIdSchema.nullable(),
  workspaceSlug: workspaceSlugSchema,
});

export const workspaceFileDeleteParamsSchema = z.object({
  id: z.string().min(1),
});

export const workspaceFileListResponseSchema = z.object({
  workspace: workspaceContextSchema,
  files: z.array(workspaceFileSchema),
});

export const workspaceFileUploadResponseSchema = z.object({
  file: workspaceFileSchema,
});

export const workspaceFileDeleteResponseSchema = z.object({
  ok: z.literal(true),
});

export const workspaceFileErrorCodeSchema = z.enum([
  "authorization_required",
  "invalid_session",
  "workspace_file_missing",
  "unsupported_file_type",
  "file_too_large",
  "workspace_file_not_found",
  "workspace_storage_unreachable",
  "workspace_storage_auth_failed",
  "workspace_storage_bucket_unavailable",
  "workspace_thumbnail_not_ready",
  "workspace_thumbnail_failed",
  "module_capability_required",
  "workspace_file_upload_failed",
  "workspace_file_delete_failed",
]);

export const workspaceFileErrorResponseSchema = z.object({
  error: workspaceFileErrorCodeSchema,
  message: z.string(),
  requiredCapability: workspaceFileCapabilitySchema.optional(),
});
