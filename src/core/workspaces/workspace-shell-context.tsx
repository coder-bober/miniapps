"use client";

import { Alert, Button, Group, Modal, Select, Stack, Text, TextInput } from "@mantine/core";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { SiteDictionary } from "@/lib/i18n/dictionaries";

export type WorkspaceSummary = {
  id: string | null;
  slug: string;
  name: string;
  kind: "personal" | "shared";
  membershipRole: "owner" | "admin" | "member";
};

type WorkspaceShellContextValue = {
  workspaces: WorkspaceSummary[];
  currentWorkspace: WorkspaceSummary | null;
  loading: boolean;
  error: string | null;
  fallbackNotice: string | null;
  switchWorkspace: (workspaceId: string | null) => void;
  createWorkspace: (name: string) => Promise<{ ok: true } | { ok: false; message: string }>;
};

const WorkspaceShellContext = createContext<WorkspaceShellContextValue | null>(null);
const workspaceLoadRetryCount = 3;

type WorkspaceShellProviderProps = {
  dictionary: SiteDictionary["app"]["shared"];
  children?: ReactNode;
};

export function WorkspaceShellProvider({ dictionary, children }: WorkspaceShellProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);

  const loadWorkspaces = useCallback(async (options?: { keepLoadingState?: boolean }) => {
    const keepLoadingState = options?.keepLoadingState ?? false;

    if (!keepLoadingState) {
      setLoading(true);
    }

    setError(null);

    try {
      for (let attempt = 1; attempt <= workspaceLoadRetryCount; attempt += 1) {
        try {
          const response = await fetch("/api/workspaces", {
            method: "GET",
            cache: "no-store",
          });
          const payload = (await response.json().catch(() => null)) as
            | { workspaces?: WorkspaceSummary[]; message?: string }
            | null;

          if (!response.ok) {
            if (attempt === workspaceLoadRetryCount) {
              setWorkspaces([]);
              setError(payload?.message ?? dictionary.workspaceUnavailable);
            }

            if (attempt < workspaceLoadRetryCount) {
              await new Promise((resolve) => window.setTimeout(resolve, 500 * attempt));
              continue;
            }

            return [];
          }

          const resolvedWorkspaces = payload?.workspaces ?? [];
          setWorkspaces(resolvedWorkspaces);
          return resolvedWorkspaces;
        } catch {
          if (attempt === workspaceLoadRetryCount) {
            throw new Error("workspace-fetch-failed");
          }

          await new Promise((resolve) => window.setTimeout(resolve, 500 * attempt));
        }
      }
    } catch {
      setWorkspaces([]);
      setError(dictionary.workspaceUnavailable);
    } finally {
      if (!keepLoadingState) {
        setLoading(false);
      }
    }

    return [];
  }, [dictionary.workspaceUnavailable]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadWorkspaces();
    });
  }, [loadWorkspaces]);

  const currentWorkspace = useMemo(() => {
    const selectedWorkspaceId = searchParams.get("bbb");

    if (selectedWorkspaceId) {
      return workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? workspaces[0] ?? null;
    }

    return workspaces[0] ?? null;
  }, [searchParams, workspaces]);

  useEffect(() => {
    const selectedWorkspaceId = searchParams.get("bbb");

    if (!selectedWorkspaceId) {
      queueMicrotask(() => {
        setFallbackNotice(null);
      });
      return;
    }

    if (!workspaces.length) {
      return;
    }

    const matchedWorkspace = workspaces.find((workspace) => workspace.id === selectedWorkspaceId);
    queueMicrotask(() => {
      setFallbackNotice(matchedWorkspace ? null : dictionary.workspaceFallbackNotice);
    });
  }, [dictionary.workspaceFallbackNotice, searchParams, workspaces]);

  const switchWorkspace = useCallback((workspaceId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());

    if (workspaceId) {
      params.set("bbb", workspaceId);
    } else {
      params.delete("bbb");
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }, [pathname, router, searchParams]);

  const createWorkspace = useCallback(async (name: string) => {
    const response = await fetch("/api/workspaces", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ name }),
    });
    const payload = (await response.json().catch(() => null)) as
      | { workspace?: WorkspaceSummary; message?: string }
      | null;

    if (!response.ok || !payload?.workspace) {
      return {
        ok: false as const,
        message: payload?.message ?? dictionary.workspaceCreateFailed,
      };
    }

    const updatedWorkspaces = await loadWorkspaces({ keepLoadingState: true });
    const createdWorkspace =
      updatedWorkspaces.find((workspace) => workspace.id === payload.workspace?.id) ??
      payload.workspace;

    switchWorkspace(createdWorkspace.id ?? null);

    return { ok: true as const };
  }, [dictionary.workspaceCreateFailed, loadWorkspaces, switchWorkspace]);

  const value = useMemo(
    () => ({
      workspaces,
      currentWorkspace,
      loading,
      error,
      fallbackNotice,
      switchWorkspace,
      createWorkspace,
    }),
    [createWorkspace, currentWorkspace, error, fallbackNotice, loading, switchWorkspace, workspaces],
  );

  return <WorkspaceShellContext.Provider value={value}>{children}</WorkspaceShellContext.Provider>;
}

export function useWorkspaceShellContext() {
  const context = useContext(WorkspaceShellContext);

  if (!context) {
    throw new Error("Workspace shell context is missing.");
  }

  return context;
}

type WorkspaceShellSwitcherProps = {
  dictionary: SiteDictionary["app"]["shared"];
};

export function WorkspaceShellSwitcher({ dictionary }: WorkspaceShellSwitcherProps) {
  const { workspaces, currentWorkspace, loading, error, fallbackNotice, switchWorkspace, createWorkspace } =
    useWorkspaceShellContext();
  const [createOpened, setCreateOpened] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, startCreateTransition] = useTransition();

  const closeCreateModal = useCallback(() => {
    setCreateOpened(false);
    setCreateError(null);
    setNewWorkspaceName("");
  }, []);

  if (loading) {
    return (
      <div>
        <Text size="sm" c="dimmed">
          {dictionary.workspaceLabel}
        </Text>
        <Text fw={700}>...</Text>
      </div>
    );
  }

  if (error) {
    return (
      <Alert color="red" py="xs" px="sm">
        {error}
      </Alert>
    );
  }

  if (!currentWorkspace) {
    return null;
  }

  return (
    <div>
      <Group align="end" gap="md">
        <WorkspaceCurrentSummary dictionary={dictionary} workspace={currentWorkspace} />
        <Group align="end" gap="sm">
          {workspaces.length > 1 ? (
            <Select
              label={dictionary.workspaceLabel}
              description={dictionary.workspaceHint}
              data={workspaces.map((workspace) => ({
                value: workspace.id ?? workspace.slug,
                label: formatWorkspaceLabel(workspace, dictionary),
              }))}
              value={currentWorkspace.id ?? currentWorkspace.slug}
              onChange={(value) => switchWorkspace(workspaces.find((workspace) => (workspace.id ?? workspace.slug) === value)?.id ?? null)}
              allowDeselect={false}
              w={{ base: "100%", sm: 320 }}
            />
          ) : null}
          <Button variant="light" color="teal" onClick={() => setCreateOpened(true)}>
            {dictionary.workspaceCreateAction}
          </Button>
        </Group>
      </Group>
      {fallbackNotice ? (
        <Alert color="yellow" mt="sm" py="xs" px="sm">
          {fallbackNotice}
        </Alert>
      ) : null}
      <Modal
        opened={createOpened}
        onClose={closeCreateModal}
        title={dictionary.workspaceCreateTitle}
        centered
      >
        <Stack gap="md">
          <Text c="dimmed" size="sm">
            {dictionary.workspaceCreateHint}
          </Text>
          <TextInput
            label={dictionary.workspaceCreateLabel}
            placeholder={dictionary.workspaceCreatePlaceholder}
            value={newWorkspaceName}
            onChange={(event) => setNewWorkspaceName(event.currentTarget.value)}
          />
          {createError ? <Alert color="red">{createError}</Alert> : null}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeCreateModal}>
              {dictionary.workspaceCreateCancel}
            </Button>
            <Button
              color="teal"
              loading={creating}
              onClick={() => {
                startCreateTransition(async () => {
                  setCreateError(null);
                  const result = await createWorkspace(newWorkspaceName);

                  if (!result.ok) {
                    setCreateError(result.message);
                    return;
                  }

                  closeCreateModal();
                });
              }}
            >
              {dictionary.workspaceCreateSubmit}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}

function WorkspaceCurrentSummary({
  dictionary,
  workspace,
}: {
  dictionary: SiteDictionary["app"]["shared"];
  workspace: WorkspaceSummary;
}) {
  return (
    <div>
      <Text size="sm" c="dimmed">
        {dictionary.workspaceLabel}
      </Text>
      <Text fw={700}>{workspace.name}</Text>
      <Text size="sm" c="dimmed">
        {formatWorkspaceMeta(workspace, dictionary)}
      </Text>
    </div>
  );
}

function formatWorkspaceLabel(
  workspace: WorkspaceSummary,
  dictionary: SiteDictionary["app"]["shared"],
) {
  return `${workspace.name} · ${formatWorkspaceMeta(workspace, dictionary)}`;
}

function formatWorkspaceMeta(
  workspace: WorkspaceSummary,
  dictionary: SiteDictionary["app"]["shared"],
) {
  const kind =
    workspace.kind === "personal"
      ? dictionary.workspaceKindPersonal
      : dictionary.workspaceKindShared;
  const role =
    workspace.membershipRole === "owner"
      ? dictionary.workspaceRoleOwner
      : workspace.membershipRole === "admin"
        ? dictionary.workspaceRoleAdmin
        : dictionary.workspaceRoleMember;

  return `${kind} · ${role}`;
}
