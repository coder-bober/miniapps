import {
  moduleLabRunJobRequestSchema,
} from "../../../../src/shared/api/module-lab.mjs";
import {
  getUserWorkspaceModuleAccess,
  sendModuleCapabilityRequired,
} from "../../../core/authz/module-access.mjs";
import { resolveAuthenticatedRequest } from "../../../lib/auth.mjs";
import { getRegisteredModuleJob } from "../../../modules/jobs.mjs";

function sendModuleLabFailed(request, reply, error) {
  request.log.error(error);
  return reply.code(500).send({
    error: "module_lab_failed",
    message: "The module-lab request failed.",
  });
}

function sendWorkspaceRequired(reply) {
  return reply.code(400).send({
    error: "workspace_required",
    message: "A workspaceId is required for authenticated module-lab requests.",
  });
}

export async function registerModuleLabRoutes(app) {
  app.get("/v1/module-lab", async (request, reply) => {
    const authentication = await resolveAuthenticatedRequest(request, reply);

    if (!authentication.ok) {
      return authentication.response;
    }

    const requestedWorkspaceId = readRequestedWorkspaceId(request);

    if (!requestedWorkspaceId) {
      return sendWorkspaceRequired(reply);
    }

    const moduleAccess = await getUserWorkspaceModuleAccess({
      services: request.server.services,
      userId: authentication.user.id,
      workspaceId: requestedWorkspaceId,
      moduleId: "module-lab",
    });

    if (!moduleAccess.capabilities.includes("module-lab.read")) {
      return sendModuleCapabilityRequired(reply, "module-lab.read");
    }

    const job = getRegisteredModuleJob("module-lab.echo");

    return reply.send({
      module: {
        id: "module-lab",
        label: "Module Lab",
      },
      role: moduleAccess.moduleRole ?? moduleAccess.role ?? null,
      capabilities: moduleAccess.capabilities,
      jobs: job ? [job] : [],
    });
  });

  app.post("/v1/module-lab/job", async (request, reply) => {
    const authentication = await resolveAuthenticatedRequest(request, reply);

    if (!authentication.ok) {
      return authentication.response;
    }

    const requestedWorkspaceId = readRequestedWorkspaceId(request);

    if (!requestedWorkspaceId) {
      return sendWorkspaceRequired(reply);
    }

    const moduleAccess = await getUserWorkspaceModuleAccess({
      services: request.server.services,
      userId: authentication.user.id,
      workspaceId: requestedWorkspaceId,
      moduleId: "module-lab",
    });

    if (!moduleAccess.capabilities.includes("module-lab.run_job")) {
      return sendModuleCapabilityRequired(reply, "module-lab.run_job");
    }

    const payload = moduleLabRunJobRequestSchema.parse(request.body ?? {});

    try {
      const queuedJob = await request.server.services.enqueueModuleJob("module-lab.echo", {
        message: payload.message,
        triggeredByUserId: authentication.user.id,
        workspaceId: requestedWorkspaceId,
      });

      return reply.send({
        ok: true,
        jobId: queuedJob.jobId,
        queue: queuedJob.queue,
        queuedAt: queuedJob.queuedAt,
        provider: queuedJob.provider ?? null,
        providerJobId: queuedJob.providerJobId ?? null,
        message: "The module-lab job was queued.",
      });
    } catch (error) {
      return sendModuleLabFailed(request, reply, error);
    }
  });
}

function readRequestedWorkspaceId(request) {
  const workspaceId = request.query?.workspaceId;

  if (typeof workspaceId !== "string") {
    return null;
  }

  const trimmed = workspaceId.trim();
  return trimmed.length > 0 ? trimmed : null;
}
