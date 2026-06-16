export async function getUserDefaultWorkspaceContext({
  services,
  userId,
  workspaceId = null,
  workspaceSlug = "default",
}) {
  if (workspaceId) {
    return {
      workspaceId,
      workspaceSlug,
    };
  }

  if (workspaceSlug !== "default" || typeof services.getPersonalWorkspace !== "function") {
    return {
      workspaceId: null,
      workspaceSlug,
    };
  }

  const personalWorkspace = await services.getPersonalWorkspace({ userId });

  return {
    workspaceId: personalWorkspace?.id ?? null,
    workspaceSlug,
  };
}
