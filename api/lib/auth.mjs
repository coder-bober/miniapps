function getBearerToken(authorizationHeader) {
  return authorizationHeader?.startsWith("Bearer ")
    ? authorizationHeader.slice("Bearer ".length).trim()
    : "";
}

export async function resolveAuthenticatedRequest(request, reply) {
  const accessToken = getBearerToken(request.headers.authorization);

  if (!accessToken) {
    return {
      ok: false,
      response: reply.code(401).send({
        error: "authorization_required",
        message: "A bearer token is required.",
      }),
    };
  }

  const user = await request.server.services.verifyAccessToken(accessToken);

  if (!user) {
    return {
      ok: false,
      response: reply.code(401).send({
        error: "invalid_session",
        message: "The access token is missing or invalid.",
      }),
    };
  }

  return {
    ok: true,
    accessToken,
    user,
  };
}
