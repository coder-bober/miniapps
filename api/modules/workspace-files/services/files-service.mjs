import { validateWorkspaceFile } from "../../../services/file-validation.mjs";

const defaultMaxUploadBytes = 10 * 1024 * 1024;

export function createWorkspaceFilesService(services) {
  return {
    async listFiles({ userId, workspaceId = null, workspaceSlug }) {
      const workspaceContext =
        typeof services.resolveWorkspaceContext === "function"
          ? await services.resolveWorkspaceContext({
              userId,
              workspaceId,
              workspaceSlug,
            })
          : {
              workspaceId: null,
              workspaceSlug,
            };

      return services.listWorkspaceFiles({
        userId,
        workspaceId: workspaceContext.workspaceId,
        workspaceSlug: workspaceContext.workspaceSlug,
      });
    },
    async createFile({ userId, workspaceId = null, workspaceSlug, fileName, declaredMimeType, buffer }) {
      const workspaceContext =
        typeof services.resolveWorkspaceContext === "function"
          ? await services.resolveWorkspaceContext({
              userId,
              workspaceId,
              workspaceSlug,
            })
          : {
              workspaceId: null,
              workspaceSlug,
            };

      if (buffer.length > defaultMaxUploadBytes) {
        return {
          ok: false,
          error: "file_too_large",
        };
      }

      const validatedFile = validateWorkspaceFile({
        declaredMimeType,
        buffer,
      });

      if (!validatedFile.ok) {
        return {
          ok: false,
          error: "unsupported_file_type",
        };
      }

      const storedName = `${Date.now()}-${fileName}`;
      const storageKey = services.buildWorkspaceObjectKey({
        userId,
        workspaceSlug: workspaceContext.workspaceSlug,
        fileName: storedName,
      });

      await services.uploadWorkspaceFileObject({
        storageKey,
        body: buffer,
        contentType: validatedFile.mimeType,
      });

      const createdFile = await services.createWorkspaceFile({
        userId,
        workspaceId: workspaceContext.workspaceId,
        workspaceSlug: workspaceContext.workspaceSlug,
        storageBucket: services.getBucketName(),
        storageKey,
        originalName: fileName,
        storedName,
        mimeType: validatedFile.mimeType,
        sizeBytes: buffer.length,
        kind: validatedFile.kind,
        thumbnailStatus: "pending",
        thumbnailError: null,
      });

      await services.enqueueModuleJob("workspace-files.generate-thumbnail", {
        fileId: createdFile.id,
        userId,
        workspaceId: workspaceContext.workspaceId,
        workspaceSlug: workspaceContext.workspaceSlug,
        storageKey,
        mimeType: createdFile.mimeType,
        kind: createdFile.kind,
      });

      return {
        ok: true,
        file: createdFile,
      };
    },
    async deleteFile({ userId, workspaceId = null, fileId }) {
      const existingFile = await services.findWorkspaceFile({
        ...(workspaceId ? { workspaceId } : { userId }),
        fileId,
      });

      if (!existingFile) {
        return {
          ok: false,
          error: "not_found",
        };
      }

      await services.deleteWorkspaceFileObject({
        storageKey: existingFile.storageKey,
      });

      if (existingFile.thumbnailStorageKey) {
        await services.deleteWorkspaceFileObject({
          storageKey: existingFile.thumbnailStorageKey,
        });
      }

      await services.deleteWorkspaceFile({
        ...(workspaceId ? { workspaceId } : { userId }),
        fileId,
      });

      return {
        ok: true,
      };
    },
  };
}
