import { classifyStorageError } from "../services/storage.mjs";

export function sendWorkspaceThumbnailNotReady(reply) {
  return reply.code(404).send({
    error: "workspace_thumbnail_not_ready",
    message: "The workspace thumbnail is not available yet.",
  });
}

export function sendWorkspaceThumbnailFailed(request, reply, error) {
  request.log.error(error, "Workspace thumbnail delivery failed");
  const storageError = classifyStorageError(error);

  if (storageError === "unreachable") {
    return reply.code(503).send({
      error: "workspace_storage_unreachable",
      message: "The storage backend is unreachable.",
    });
  }

  if (storageError === "auth_failed") {
    return reply.code(502).send({
      error: "workspace_storage_auth_failed",
      message: "The storage backend rejected the configured credentials.",
    });
  }

  if (storageError === "bucket_unavailable") {
    return reply.code(503).send({
      error: "workspace_storage_bucket_unavailable",
      message: "The configured storage bucket is unavailable.",
    });
  }

  return reply.code(500).send({
    error: "workspace_thumbnail_failed",
    message: "The backend could not load the workspace thumbnail.",
  });
}
