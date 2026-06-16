export function jsonResponse(payload, init) {
  return Response.json(payload, init);
}

export function createInvalidSessionResponse() {
  return jsonResponse(
    {
      error: "invalid_session",
      message: "The current session is missing or invalid.",
    },
    { status: 401 },
  );
}

export function createModuleDisabledResponse(payload) {
  return jsonResponse(payload, { status: 404 });
}

export async function createBearerAuthorizationHeaders(createSupabaseServerClient) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return null;
  }

  return {
    authorization: `Bearer ${session.access_token}`,
  };
}

export async function createAuthorizedUserContext(createSupabaseServerClient) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser(session.access_token);

  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    authorization: `Bearer ${session.access_token}`,
  };
}

export async function forwardJsonResponse(response) {
  const payload = await response.json().catch(() => null);

  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}

export function createBinaryResponse(body, {
  status = 200,
  contentType,
  cacheControl = "no-store",
}) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": cacheControl,
    },
  });
}
