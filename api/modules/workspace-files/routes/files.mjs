import {
  workspaceFileDeleteParamsSchema,
  workspaceFileListRequestSchema,
} from "../../../../src/shared/api/workspace-files.mjs";
import { getUserWorkspaceModuleAccess, sendModuleCapabilityRequired } from "../../../core/authz/module-access.mjs";
import { getUserDefaultWorkspaceContext } from "../../../core/workspaces/default-workspace.mjs";
import { resolveAuthenticatedRequest } from "../../../lib/auth.mjs";
import {
  sendWorkspaceThumbnailFailed,
  sendWorkspaceThumbnailNotReady,
} from "../../../lib/thumbnail-replies.mjs";
import { createWorkspaceFilesService } from "../services/files-service.mjs";
import {
  sendUnsupportedWorkspaceFileType,
  sendWorkspaceFileDeleteFailed,
  sendWorkspaceFileMissing,
  sendWorkspaceFileNotFound,
  sendWorkspaceFileTooLarge,
  sendWorkspaceFileUploadFailed,
} from "../../../lib/workspace-replies.mjs";

export async function registerWorkspaceFileRoutes(app) {
  app.get("/v1/workspace/files", async (request, reply) => {
    const authentication = await resolveAuthenticatedRequest(request, reply);

    if (!authentication.ok) {
      return authentication.response;
    }

    const query = workspaceFileListRequestSchema.parse(request.query ?? {});
    const workspaceContext = await getUserDefaultWorkspaceContext({
      services: request.server.services,
      userId: authentication.user.id,
      workspaceId: query.workspaceId,
      workspaceSlug: query.workspaceSlug,
    });
    const workspaceAccess = await getUserWorkspaceModuleAccess({
      services: request.server.services,
      userId: authentication.user.id,
      workspaceId: workspaceContext.workspaceId,
      moduleId: "workspace-files",
    });

    if (!workspaceAccess.capabilities.includes("workspace-files.read")) {
      return sendModuleCapabilityRequired(reply, "workspace-files.read");
    }

    const workspaceFiles = createWorkspaceFilesService(request.server.services);
    const files = await workspaceFiles.listFiles({
      userId: authentication.user.id,
      workspaceId: workspaceContext.workspaceId,
      workspaceSlug: query.workspaceSlug,
    });

    return reply.send({
      workspace: workspaceContext,
      files,
    });
  });

  app.post("/v1/workspace/files", async (request, reply) => {
    const authentication = await resolveAuthenticatedRequest(request, reply);

    if (!authentication.ok) {
      return authentication.response;
    }

    const file = await request.file();

    if (!file) {
      return sendWorkspaceFileMissing(reply);
    }

    let buffer;

    try {
      buffer = await file.toBuffer();
    } catch (error) {
      if (error?.code === "FST_REQ_FILE_TOO_LARGE") {
        return sendWorkspaceFileTooLarge(reply);
      }

      throw error;
    }

    const workspaceRequest = workspaceFileListRequestSchema.parse({
      workspaceId: file.fields.workspaceId?.value ?? undefined,
      workspaceSlug: file.fields.workspaceSlug?.value ?? "default",
    });
    const workspaceContext = await getUserDefaultWorkspaceContext({
      services: request.server.services,
      userId: authentication.user.id,
      workspaceId: workspaceRequest.workspaceId,
      workspaceSlug: workspaceRequest.workspaceSlug,
    });
    const workspaceAccess = await getUserWorkspaceModuleAccess({
      services: request.server.services,
      userId: authentication.user.id,
      workspaceId: workspaceContext.workspaceId,
      moduleId: "workspace-files",
    });

    if (!workspaceAccess.capabilities.includes("workspace-files.upload")) {
      return sendModuleCapabilityRequired(reply, "workspace-files.upload");
    }

    const workspaceFiles = createWorkspaceFilesService(request.server.services);

    try {
      const createdFile = await workspaceFiles.createFile({
        userId: authentication.user.id,
        workspaceId: workspaceContext.workspaceId,
        workspaceSlug: workspaceContext.workspaceSlug,
        fileName: file.filename,
        declaredMimeType: file.mimetype,
        buffer,
      });

      if (!createdFile.ok) {
        if (createdFile.error === "file_too_large") {
          return sendWorkspaceFileTooLarge(reply);
        }

        return sendUnsupportedWorkspaceFileType(reply);
      }

      return reply.code(201).send({ file: createdFile.file });
    } catch (error) {
      return sendWorkspaceFileUploadFailed(request, reply, error);
    }
  });

  app.delete("/v1/workspace/files/:id", async (request, reply) => {
    const authentication = await resolveAuthenticatedRequest(request, reply);

    if (!authentication.ok) {
      return authentication.response;
    }

    const params = workspaceFileDeleteParamsSchema.parse(request.params);
    const existingFile = await request.server.services.findWorkspaceFile({
      fileId: params.id,
    });

    if (!existingFile) {
      return sendWorkspaceFileNotFound(reply);
    }

    const workspaceContext = await getUserDefaultWorkspaceContext({
      services: request.server.services,
      userId: authentication.user.id,
      workspaceSlug: existingFile.workspaceSlug ?? "default",
    });
    const workspaceAccess = await getUserWorkspaceModuleAccess({
      services: request.server.services,
      userId: authentication.user.id,
      workspaceId: existingFile.workspaceId ?? workspaceContext.workspaceId,
      moduleId: "workspace-files",
    });

    if (!workspaceAccess.capabilities.includes("workspace-files.delete")) {
      return sendModuleCapabilityRequired(reply, "workspace-files.delete");
    }

    const workspaceFiles = createWorkspaceFilesService(request.server.services);

    try {
      const deletion = await workspaceFiles.deleteFile({
        workspaceId: existingFile.workspaceId ?? workspaceContext.workspaceId,
        userId: authentication.user.id,
        fileId: params.id,
      });

      if (!deletion.ok) {
        return sendWorkspaceFileNotFound(reply);
      }

      return reply.send({ ok: true });
    } catch (error) {
      return sendWorkspaceFileDeleteFailed(request, reply, error);
    }
  });

  app.get("/v1/workspace/files/:id/thumbnail", async (request, reply) => {
    const authentication = await resolveAuthenticatedRequest(request, reply);

    if (!authentication.ok) {
      return authentication.response;
    }

    const params = workspaceFileDeleteParamsSchema.parse(request.params);
    const existingFile = await request.server.services.findWorkspaceFile({
      fileId: params.id,
    });

    if (!existingFile?.thumbnailStorageKey) {
      return sendWorkspaceThumbnailNotReady(reply);
    }

    const workspaceContext = await getUserDefaultWorkspaceContext({
      services: request.server.services,
      userId: authentication.user.id,
      workspaceSlug: existingFile.workspaceSlug ?? "default",
    });
    const workspaceAccess = await getUserWorkspaceModuleAccess({
      services: request.server.services,
      userId: authentication.user.id,
      workspaceId: existingFile.workspaceId ?? workspaceContext.workspaceId,
      moduleId: "workspace-files",
    });

    if (!workspaceAccess.capabilities.includes("workspace-files.read")) {
      return sendModuleCapabilityRequired(reply, "workspace-files.read");
    }

    try {
      const body = await request.server.services.downloadWorkspaceFileObject({
        storageKey: existingFile.thumbnailStorageKey,
      });

      reply.header("Content-Type", existingFile.thumbnailMimeType ?? "image/webp");
      return reply.send(body);
    } catch (error) {
      return sendWorkspaceThumbnailFailed(request, reply, error);
    }
  });
}
