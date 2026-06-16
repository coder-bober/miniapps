import {
  accountDeleteRequestSchema,
  accountSignOutEverywhereRequestSchema,
} from "../../src/shared/api/account.mjs";
import {
  sendAccountDeletionFailed,
  sendConfirmationMismatch,
  sendGlobalSignOutFailed,
} from "../lib/account-replies.mjs";
import { resolveAuthenticatedRequest } from "../lib/auth.mjs";

export async function registerAccountRoutes(app) {
  app.post("/v1/account/sign-out-everywhere", async (request, reply) => {
    accountSignOutEverywhereRequestSchema.parse(request.body ?? {});
    const authentication = await resolveAuthenticatedRequest(request, reply);

    if (!authentication.ok) {
      return authentication.response;
    }

    try {
      await request.server.services.signOutEverywhere(authentication.accessToken);
    } catch (error) {
      return sendGlobalSignOutFailed(request, reply, error);
    }

    return reply.send({ ok: true });
  });

  app.post(
    "/v1/account/delete",
    async (request, reply) => {
      const body = accountDeleteRequestSchema.parse(request.body);
      const authentication = await resolveAuthenticatedRequest(request, reply);

      if (!authentication.ok) {
        return authentication.response;
      }

      const confirmation = body.confirmation.trim().toLowerCase();
      const expectedEmail = authentication.user.email?.trim().toLowerCase() ?? "";

      if (!expectedEmail || confirmation !== expectedEmail) {
        return sendConfirmationMismatch(reply);
      }

      try {
        await request.server.services.deleteAccount(authentication.user.id);
      } catch (error) {
        return sendAccountDeletionFailed(request, reply, error);
      }

      return reply.send({ ok: true });
    },
  );
}
