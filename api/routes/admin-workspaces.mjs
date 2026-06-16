import {
  updateWorkspaceMemberRoleRequestSchema,
  updateWorkspaceModuleRoleRequestSchema,
} from "../../src/shared/api/workspaces.mjs";
import { isAppAdminEmail } from "../../src/shared/admin/app-admin.mjs";
import { resolveAuthenticatedRequest } from "../lib/auth.mjs";

function mapAdminWorkspaceError(error, reply, fallback) {
  if (error?.code === "workspace_member_not_found") {
    return reply.code(404).send({
      error: "workspace_member_not_found",
      message: "The requested workspace member was not found.",
    });
  }

  if (error?.code === "workspace_module_role_member_not_found") {
    return reply.code(404).send({
      error: "workspace_module_role_member_not_found",
      message: "The requested workspace member was not found.",
    });
  }

  if (error?.code === "workspace_member_owner_protected") {
    return reply.code(400).send({
      error: "workspace_member_owner_protected",
      message: "The workspace owner cannot be modified through this action.",
    });
  }

  if (error?.code === "workspace_member_role_invalid" || error?.name === "ZodError") {
    return reply.code(400).send(fallback);
  }

  if (error?.code === "workspace_module_role_invalid" || error?.code === "workspace_module_invalid") {
    return reply.code(400).send(fallback);
  }

  return null;
}

async function resolveAppAdminRequest(request, reply) {
  const authentication = await resolveAuthenticatedRequest(request, reply);

  if (!authentication.ok) {
    return authentication;
  }

  if (!isAppAdminEmail(authentication.user.email)) {
    return {
      ok: false,
      response: reply.code(403).send({
        error: "app_admin_required",
        message: "The current user is not allowed to use app-admin tools.",
      }),
    };
  }

  return authentication;
}

export async function registerAdminWorkspaceRoutes(app) {
  app.get("/v1/admin/workspaces", async (request, reply) => {
    const authentication = await resolveAppAdminRequest(request, reply);

    if (!authentication.ok) {
      return authentication.response;
    }

    try {
      const limit = request.query?.limit === undefined ? undefined : Number(request.query.limit);
      const workspaces = await request.server.services.listAdminWorkspaces({ limit });
      return reply.send({ workspaces });
    } catch (error) {
      request.log.error({ err: error }, "Admin workspace list failed");
      return reply.code(500).send({
        error: "admin_workspace_list_failed",
        message: "The backend could not load the admin workspace list.",
      });
    }
  });

  app.get("/v1/admin/workspaces/:workspaceId/members", async (request, reply) => {
    const authentication = await resolveAppAdminRequest(request, reply);

    if (!authentication.ok) {
      return authentication.response;
    }

    try {
      const members = await request.server.services.listAdminWorkspaceMembers({
        workspaceId: request.params.workspaceId,
      });
      return reply.send({ members });
    } catch (error) {
      request.log.error({ err: error }, "Admin workspace member list failed");
      return reply.code(500).send({
        error: "admin_workspace_member_list_failed",
        message: "The backend could not load the admin workspace members.",
      });
    }
  });

  app.patch("/v1/admin/workspaces/:workspaceId/members/:userId", async (request, reply) => {
    const authentication = await resolveAppAdminRequest(request, reply);

    if (!authentication.ok) {
      return authentication.response;
    }

    try {
      const payload = updateWorkspaceMemberRoleRequestSchema.parse(request.body ?? {});
      const member = await request.server.services.updateAdminWorkspaceMemberRole({
        workspaceId: request.params.workspaceId,
        targetUserId: request.params.userId,
        role: payload.role,
      });
      return reply.send({ member });
    } catch (error) {
      const handled = mapAdminWorkspaceError(error, reply, {
        error: "workspace_member_role_invalid",
        message: "Provide a role of admin or member.",
      });

      if (handled) {
        return handled;
      }

      request.log.error({ err: error }, "Admin workspace member update failed");
      return reply.code(500).send({
        error: "admin_workspace_member_update_failed",
        message: "The backend could not update the admin workspace member.",
      });
    }
  });

  app.get("/v1/admin/workspaces/:workspaceId/module-roles/module-lab", async (request, reply) => {
    const authentication = await resolveAppAdminRequest(request, reply);

    if (!authentication.ok) {
      return authentication.response;
    }

    try {
      const moduleRoles = await request.server.services.listAdminWorkspaceModuleRoles({
        workspaceId: request.params.workspaceId,
        moduleId: "module-lab",
      });
      return reply.send({ moduleRoles });
    } catch (error) {
      request.log.error({ err: error }, "Admin workspace module role list failed");
      return reply.code(500).send({
        error: "admin_workspace_module_role_list_failed",
        message: "The backend could not load the admin workspace module roles.",
      });
    }
  });

  app.patch("/v1/admin/workspaces/:workspaceId/module-roles/module-lab/:userId", async (request, reply) => {
    const authentication = await resolveAppAdminRequest(request, reply);

    if (!authentication.ok) {
      return authentication.response;
    }

    try {
      const payload = updateWorkspaceModuleRoleRequestSchema.parse(request.body ?? {});
      const moduleRole = await request.server.services.updateAdminWorkspaceModuleRole({
        workspaceId: request.params.workspaceId,
        targetUserId: request.params.userId,
        moduleId: "module-lab",
        role: payload.role,
      });
      return reply.send({ moduleRole });
    } catch (error) {
      const handled = mapAdminWorkspaceError(error, reply, {
        error: "workspace_module_role_invalid",
        message: "Provide a valid module-lab role.",
      });

      if (handled) {
        return handled;
      }

      request.log.error({ err: error }, "Admin workspace module role update failed");
      return reply.code(500).send({
        error: "admin_workspace_module_role_update_failed",
        message: "The backend could not update the admin workspace module role.",
      });
    }
  });

  app.delete("/v1/admin/workspaces/:workspaceId/module-roles/module-lab/:userId", async (request, reply) => {
    const authentication = await resolveAppAdminRequest(request, reply);

    if (!authentication.ok) {
      return authentication.response;
    }

    try {
      await request.server.services.deleteAdminWorkspaceModuleRole({
        workspaceId: request.params.workspaceId,
        targetUserId: request.params.userId,
        moduleId: "module-lab",
      });
      return reply.send({ ok: true });
    } catch (error) {
      const handled = mapAdminWorkspaceError(error, reply, {
        error: "workspace_module_role_remove_failed",
        message: "The workspace module role removal request was invalid.",
      });

      if (handled) {
        return handled;
      }

      request.log.error({ err: error }, "Admin workspace module role removal failed");
      return reply.code(500).send({
        error: "admin_workspace_module_role_remove_failed",
        message: "The backend could not remove the admin workspace module role.",
      });
    }
  });
}
