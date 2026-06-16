import { classifyStorageError } from "../services/storage.mjs";

export function sendWorkspaceFileMissing(reply) {
  return reply.code(400).send({
    error: "workspace_file_missing",
    message: "A file upload is required.",
  });
}

export function sendUnsupportedWorkspaceFileType(reply) {
  return reply.code(415).send({
    error: "unsupported_file_type",
    message: "This file type is not supported for workspace uploads.",
  });
}

export function sendWorkspaceFileTooLarge(reply) {
  return reply.code(413).send({
    error: "file_too_large",
    message: "The uploaded file exceeds the allowed size limit.",
  });
}

export function sendWorkspaceFileNotFound(reply) {
  return reply.code(404).send({
    error: "workspace_file_not_found",
    message: "The requested workspace file could not be found.",
  });
}

export function sendWorkspaceFileUploadFailed(request, reply, error) {
  request.log.error(error, "Workspace file upload failed");
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
    error: "workspace_file_upload_failed",
    message: "The backend could not store the workspace file.",
  });
}

export function sendWorkspaceFileDeleteFailed(request, reply, error) {
  request.log.error(error, "Workspace file deletion failed");
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
    error: "workspace_file_delete_failed",
    message: "The backend could not delete the workspace file.",
  });
}
