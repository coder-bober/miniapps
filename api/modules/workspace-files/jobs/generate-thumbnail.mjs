import sharp from "sharp";

const maxThumbnailSize = 320;

export async function generateWorkspaceFileThumbnail({ job, logger, services }) {
  logger.info(
    {
      jobId: job.id ?? null,
      jobName: job.name,
      payload: job.data,
    },
    "Processing workspace file thumbnail job",
  );

  const fileId = job.data?.fileId;

  if (!fileId) {
    throw new Error("Thumbnail job is missing fileId.");
  }

  try {
    await services.updateWorkspaceFileThumbnailState(fileId, {
      status: "pending",
      error: null,
    });

    const workspaceFile = await services.getWorkspaceFileForThumbnail(fileId);

    if (!workspaceFile) {
      logger.info({ fileId }, "Skipping thumbnail generation for missing workspace file");
      return {
        status: "missing",
        fileId,
      };
    }

    if (workspaceFile.kind !== "image") {
      logger.info(
        {
          fileId,
          kind: workspaceFile.kind,
        },
        "Skipping thumbnail generation for non-image workspace file",
      );

      await services.updateWorkspaceFileThumbnailState(fileId, {
        status: "skipped",
        error: "Thumbnail generation is not supported for this file type yet.",
        clearThumbnail: true,
      });

      return {
        status: "skipped",
        fileId,
        reason: "non-image",
      };
    }

    const originalBuffer = await services.downloadWorkspaceFileObject({
      storageKey: workspaceFile.storageKey,
    });

    const pipeline = sharp(originalBuffer).rotate().resize(maxThumbnailSize, maxThumbnailSize, {
      fit: "inside",
      withoutEnlargement: true,
    });
    const metadata = await pipeline.metadata();
    const thumbnailBuffer = await pipeline.webp({ quality: 82 }).toBuffer();
    const thumbnailStorageKey = services.buildWorkspaceThumbnailObjectKey({
      storageKey: workspaceFile.storageKey,
    });

    await services.uploadWorkspaceThumbnailObject({
      storageKey: thumbnailStorageKey,
      body: thumbnailBuffer,
    });

    await services.updateWorkspaceFileThumbnail(fileId, {
      storageKey: thumbnailStorageKey,
      mimeType: "image/webp",
      width: metadata.width ?? null,
      height: metadata.height ?? null,
      createdAt: new Date().toISOString(),
    });

    return {
      status: "completed",
      fileId,
      thumbnailStorageKey,
    };
  } catch (error) {
    await services
      .updateWorkspaceFileThumbnailState(fileId, {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      })
      .catch(() => {});

    throw error;
  }
}
