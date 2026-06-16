export * from "./workspace-files.mjs";

import type { z } from "zod";

import {
  workspaceFileDeleteParamsSchema,
  workspaceFileDeleteResponseSchema,
  workspaceFileErrorCodeSchema,
  workspaceFileErrorResponseSchema,
  workspaceFileKindSchema,
  workspaceFileThumbnailStatusSchema,
  workspaceFileListRequestSchema,
  workspaceFileListResponseSchema,
  workspaceFileSchema,
  workspaceFileUploadResponseSchema,
  workspaceSlugSchema,
} from "./workspace-files.mjs";

export type WorkspaceFile = z.infer<typeof workspaceFileSchema>;
export type WorkspaceFileKind = z.infer<typeof workspaceFileKindSchema>;
export type WorkspaceFileThumbnailStatus = z.infer<typeof workspaceFileThumbnailStatusSchema>;
export type WorkspaceSlug = z.infer<typeof workspaceSlugSchema>;
export type WorkspaceFileListRequest = z.infer<typeof workspaceFileListRequestSchema>;
export type WorkspaceFileListResponse = z.infer<typeof workspaceFileListResponseSchema>;
export type WorkspaceFileUploadResponse = z.infer<typeof workspaceFileUploadResponseSchema>;
export type WorkspaceFileDeleteParams = z.infer<typeof workspaceFileDeleteParamsSchema>;
export type WorkspaceFileDeleteResponse = z.infer<typeof workspaceFileDeleteResponseSchema>;
export type WorkspaceFileErrorCode = z.infer<typeof workspaceFileErrorCodeSchema>;
export type WorkspaceFileErrorResponse = z.infer<typeof workspaceFileErrorResponseSchema>;
