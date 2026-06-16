export function sendConfirmationMismatch(reply) {
  return reply.code(400).send({
    error: "confirmation_mismatch",
    message: "Enter your account email exactly to confirm deletion.",
  });
}

export function sendAccountDeletionFailed(request, reply, error) {
  request.log.error(error, "Account deletion failed");

  return reply.code(500).send({
    error: "account_deletion_failed",
    message: "The backend could not delete the account.",
  });
}

export function sendGlobalSignOutFailed(request, reply, error) {
  request.log.error(error, "Global sign out failed");

  return reply.code(500).send({
    error: "global_sign_out_failed",
    message: "The backend could not revoke the active sessions.",
  });
}
