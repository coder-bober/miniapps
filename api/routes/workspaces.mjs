import {
  addWorkspaceMemberRequestSchema,
  createWorkspaceRequestSchema,
  transferWorkspaceOwnershipRequestSchema,
  updateWorkspaceMemberRoleRequestSchema,
} from "../../src/shared/api/workspaces.mjs";
import { resolveAuthenticatedRequest } from "../lib/auth.mjs";

function mapWorkspaceMemberError(error, reply, fallback) {
  if (error?.code === "workspace_member_access_denied") {
    return reply.code(403).send({
      error: "workspace_member_access_denied",
      message: "The current user is not allowed to manage workspace members.",
    });
  }

  if (error?.code === "workspace_personal_membership_unsupported") {
    return reply.code(400).send({
      error: "workspace_personal_membership_unsupported",
      message: "Member management is available only for shared workspaces.",
    });
  }

  if (error?.code === "workspace_member_user_not_found") {
    return reply.code(404).send({
      error: "workspace_member_user_not_found",
      message: "No registered user was found for that email.",
    });
  }

  if (error?.code === "workspace_member_exists") {
    return reply.code(409).send({
      error: "workspace_member_exists",
      message: "That user is already a member of this workspace.",
    });
  }

  if (error?.code === "workspace_member_not_found") {
    return reply.code(404).send({
      error: "workspace_member_not_found",
      message: "The requested workspace member was not found.",
    });
  }

  if (error?.code === "workspace_member_owner_protected") {
    return reply.code(400).send({
      error: "workspace_member_owner_protected",
      message: "The workspace owner cannot be modified through this action.",
    });
  }

  if (error?.code === "workspace_transfer_invalid_target") {
    return reply.code(400).send({
      error: "workspace_transfer_invalid_target",
      message: "Ownership can be transferred only to another existing workspace member.",
    });
  }

  if (error?.name === "ZodError") {
    return reply.code(400).send(fallback);
  }

  return null;
}

export async function registerWorkspaceRoutes(app) {
  app.get("/v1/workspaces", async (request, reply) => {
    const authentication = await resolveAuthenticatedRequest(request, reply);

    if (!authentication.ok) {
      return authentication.response;
    }

    try {
      const workspaces = await request.server.services.listUserWorkspaces({
        userId: authentication.user.id,
      });

      return reply.send({ workspaces });
    } catch (error) {
      request.log.error({ err: error }, "Workspace list failed");
      return reply.code(500).send({
        error: "workspace_list_failed",
        message: "The backend could not load the workspace list.",
      });
    }
  });

  app.get("/v1/workspaces/public/:workspaceId", async (request, reply) => {
    try {
      const workspace = await request.server.services.getPublicWorkspace({
        workspaceId: request.params.workspaceId,
      });

      if (!workspace) {
        return reply.code(404).send({
          error: "workspace_not_found",
          message: "The requested public workspace was not found.",
        });
      }

      return reply.send({ workspace });
    } catch (error) {
      request.log.error({ err: error }, "Public workspace lookup failed");
      return reply.code(500).send({
        error: "workspace_lookup_failed",
        message: "The backend could not load the requested public workspace.",
      });
    }
  });

  app.get("/v1/workspaces/:workspaceId/members", async (request, reply) => {
    const authentication = await resolveAuthenticatedRequest(request, reply);

    if (!authentication.ok) {
      return authentication.response;
    }

    try {
      const members = await request.server.services.listWorkspaceMembers({
        workspaceId: request.params.workspaceId,
        actorUserId: authentication.user.id,
      });

      return reply.send({ members });
    } catch (error) {
      if (error?.code === "workspace_member_access_denied") {
        return reply.code(403).send({
          error: "workspace_member_access_denied",
          message: "The current user is not allowed to view these workspace members.",
        });
      }

      request.log.error({ err: error }, "Workspace member list failed");
      return reply.code(500).send({
        error: "workspace_member_list_failed",
        message: "The backend could not load the workspace members.",
      });
    }
  });

  app.post("/v1/workspaces/:workspaceId/members", async (request, reply) => {
    const authentication = await resolveAuthenticatedRequest(request, reply);

    if (!authentication.ok) {
      return authentication.response;
    }

    try {
      const payload = addWorkspaceMemberRequestSchema.parse(request.body ?? {});
      const member = await request.server.services.addWorkspaceMember({
        workspaceId: request.params.workspaceId,
        actorUserId: authentication.user.id,
        email: payload.email,
        role: payload.role,
      });

      return reply.code(201).send({ member });
    } catch (error) {
      const handled = mapWorkspaceMemberError(error, reply, {
        error: "workspace_member_email_invalid",
        message: "Provide a valid email and a role of admin or member.",
      });

      if (handled) {
        return handled;
      }

      request.log.error({ err: error }, "Workspace member add failed");
      return reply.code(500).send({
        error: "workspace_member_add_failed",
        message: "The backend could not add the workspace member.",
      });
    }
  });

  app.patch("/v1/workspaces/:workspaceId/members/:userId", async (request, reply) => {
    const authentication = await resolveAuthenticatedRequest(request, reply);

    if (!authentication.ok) {
      return authentication.response;
    }

    try {
      const payload = updateWorkspaceMemberRoleRequestSchema.parse(request.body ?? {});
      const member = await request.server.services.updateWorkspaceMemberRole({
        workspaceId: request.params.workspaceId,
        actorUserId: authentication.user.id,
        targetUserId: request.params.userId,
        role: payload.role,
      });

      return reply.send({ member });
    } catch (error) {
      const handled = mapWorkspaceMemberError(error, reply, {
        error: "workspace_member_role_invalid",
        message: "Provide a role of admin or member.",
      });

      if (handled) {
        return handled;
      }

      request.log.error({ err: error }, "Workspace member update failed");
      return reply.code(500).send({
        error: "workspace_member_update_failed",
        message: "The backend could not update the workspace member.",
      });
    }
  });

  app.delete("/v1/workspaces/:workspaceId/members/:userId", async (request, reply) => {
    const authentication = await resolveAuthenticatedRequest(request, reply);

    if (!authentication.ok) {
      return authentication.response;
    }

    try {
      await request.server.services.removeWorkspaceMember({
        workspaceId: request.params.workspaceId,
        actorUserId: authentication.user.id,
        targetUserId: request.params.userId,
      });

      return reply.send({ ok: true });
    } catch (error) {
      const handled = mapWorkspaceMemberError(error, reply, {
        error: "workspace_member_remove_failed",
        message: "The workspace member removal request was invalid.",
      });

      if (handled) {
        return handled;
      }

      request.log.error({ err: error }, "Workspace member removal failed");
      return reply.code(500).send({
        error: "workspace_member_remove_failed",
        message: "The backend could not remove the workspace member.",
      });
    }
  });

  app.post("/v1/workspaces/:workspaceId/members/transfer-owner", async (request, reply) => {
    const authentication = await resolveAuthenticatedRequest(request, reply);

    if (!authentication.ok) {
      return authentication.response;
    }

    try {
      const payload = transferWorkspaceOwnershipRequestSchema.parse(request.body ?? {});
      await request.server.services.transferWorkspaceOwnership({
        workspaceId: request.params.workspaceId,
        actorUserId: authentication.user.id,
        newOwnerUserId: payload.newOwnerUserId,
      });

      return reply.send({ ok: true });
    } catch (error) {
      const handled = mapWorkspaceMemberError(error, reply, {
        error: "workspace_transfer_invalid_target",
        message: "Choose another existing workspace member to receive ownership.",
      });

      if (handled) {
        return handled;
      }

      request.log.error({ err: error }, "Workspace ownership transfer failed");
      return reply.code(500).send({
        error: "workspace_transfer_failed",
        message: "The backend could not transfer workspace ownership.",
      });
    }
  });

  app.post("/v1/workspaces", async (request, reply) => {
    const authentication = await resolveAuthenticatedRequest(request, reply);

    if (!authentication.ok) {
      return authentication.response;
    }

    try {
      const payload = createWorkspaceRequestSchema.parse(request.body ?? {});
      const workspace = await request.server.services.createSharedWorkspace({
        userId: authentication.user.id,
        name: payload.name,
      });

      return reply.code(201).send({ workspace });
    } catch (error) {
      if (error?.name === "ZodError" || error?.code === "workspace_name_invalid") {
        return reply.code(400).send({
          error: "workspace_name_invalid",
          message: "Provide a workspace name between 2 and 120 characters.",
        });
      }

      request.log.error({ err: error }, "Workspace create failed");
      return reply.code(500).send({
        error: "workspace_create_failed",
        message: "The backend could not create the workspace.",
      });
    }
  });
}
