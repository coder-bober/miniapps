"use client";

import { Alert, Badge, Button, Card, Group, Select, Stack, Text, Title } from "@mantine/core";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useWorkspaceShellContext } from "@/core/workspaces/workspace-shell-context";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";

type WorkspaceMemberSummary = {
  membershipId: string;
  workspaceId: string;
  userId: string;
  role: "owner" | "admin" | "member";
  email: string | null;
  displayName: string;
};

type WorkspaceModuleRoleSummary = {
  workspaceId: string;
  userId: string;
  moduleId: "module-lab";
  role: "viewer" | "operator" | null;
};

type WorkspaceModuleLabAccessCardProps = {
  dictionary: SiteDictionary["app"]["workspace"];
};

type ModuleLabAccessDraft = "none" | "viewer" | "operator";

export function WorkspaceModuleLabAccessCard({ dictionary }: WorkspaceModuleLabAccessCardProps) {
  const { currentWorkspace } = useWorkspaceShellContext();
  const [members, setMembers] = useState<WorkspaceMemberSummary[]>([]);
  const [moduleRoles, setModuleRoles] = useState<WorkspaceModuleRoleSummary[]>([]);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, ModuleLabAccessDraft>>({});
  const [loading, setLoading] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const canManage =
    currentWorkspace?.kind === "shared" &&
    ["owner", "admin"].includes(currentWorkspace.membershipRole);

  const moduleRoleByUserId = useMemo(() => {
    return new Map(moduleRoles.map((moduleRole) => [moduleRole.userId, moduleRole.role]));
  }, [moduleRoles]);

  const loadAccess = useCallback(async () => {
    if (!currentWorkspace?.id || currentWorkspace.kind !== "shared") {
      setMembers([]);
      setModuleRoles([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [membersResponse, rolesResponse] = await Promise.all([
        fetch(`/api/workspaces/${encodeURIComponent(currentWorkspace.id)}/members`, {
          method: "GET",
          cache: "no-store",
        }),
        fetch(`/api/workspaces/${encodeURIComponent(currentWorkspace.id)}/module-roles/module-lab`, {
          method: "GET",
          cache: "no-store",
        }),
      ]);
      const membersPayload = (await membersResponse.json().catch(() => null)) as
        | { members?: WorkspaceMemberSummary[]; message?: string }
        | null;
      const rolesPayload = (await rolesResponse.json().catch(() => null)) as
        | { moduleRoles?: WorkspaceModuleRoleSummary[]; message?: string }
        | null;

      if (!membersResponse.ok) {
        setMembers([]);
        setModuleRoles([]);
        setError(
          membersPayload?.message ?? dictionary.moduleLabAccessLoadFailed,
        );
        return;
      }

      setMembers(membersPayload?.members ?? []);
      setModuleRoles(rolesResponse.ok ? rolesPayload?.moduleRoles ?? [] : []);

      if (!rolesResponse.ok) {
        setError(rolesPayload?.message ?? dictionary.moduleLabAccessLoadFailed);
      }
    } catch {
      setMembers([]);
      setModuleRoles([]);
      setError(dictionary.moduleLabAccessLoadFailed);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, dictionary.moduleLabAccessLoadFailed]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadAccess();
    });
  }, [loadAccess]);

  useEffect(() => {
    queueMicrotask(() => {
      setRoleDrafts({});
      setError(null);
      setFeedback(null);
    });
  }, [currentWorkspace?.id]);

  if (!currentWorkspace || currentWorkspace.kind !== "shared") {
    return null;
  }

  async function handleSave(member: WorkspaceMemberSummary) {
    if (!currentWorkspace?.id) {
      return;
    }

    const currentRole = moduleRoleByUserId.get(member.userId) ?? null;
    const draft = roleDrafts[member.userId] ?? toAccessDraft(currentRole);

    if (draft === toAccessDraft(currentRole)) {
      return;
    }

    setSavingUserId(member.userId);
    setError(null);
    setFeedback(null);

    try {
      const endpoint = `/api/workspaces/${encodeURIComponent(currentWorkspace.id)}/module-roles/module-lab/${encodeURIComponent(member.userId)}`;
      const response =
        draft === "none"
          ? await fetch(endpoint, { method: "DELETE" })
          : await fetch(endpoint, {
              method: "PATCH",
              headers: {
                "content-type": "application/json",
              },
              body: JSON.stringify({ role: draft }),
            });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        setError(payload?.message ?? dictionary.moduleLabAccessUpdateFailed);
        return;
      }

      setFeedback(dictionary.moduleLabAccessUpdateSuccess);
      await loadAccess();
    } catch {
      setError(dictionary.moduleLabAccessUpdateFailed);
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <Card
      radius={24}
      p={{ base: "lg", md: "xl" }}
      style={{
        background: "var(--surface-strong)",
        border: "1px solid var(--line)",
      }}
    >
      <Stack gap="md">
        <div>
          <Title order={3}>{dictionary.moduleLabAccessTitle}</Title>
          <Text c="dimmed" mt="xs">
            {dictionary.moduleLabAccessDescription}
          </Text>
        </div>

        <Alert color={canManage ? "teal" : "blue"}>
          {canManage ? dictionary.moduleLabAccessOwnerAdminNotice : dictionary.moduleLabAccessReadOnlyNotice}
        </Alert>
        {error ? <Alert color="red">{error}</Alert> : null}
        {feedback ? <Alert color="teal">{feedback}</Alert> : null}
        {loading ? <Text c="dimmed">{dictionary.membersLoading}</Text> : null}

        {!loading ? (
          <Stack gap="sm">
            {members.map((member) => {
              const currentRole = moduleRoleByUserId.get(member.userId) ?? null;
              const draft = roleDrafts[member.userId] ?? toAccessDraft(currentRole);

              return (
                <Card key={member.membershipId} radius={18} p="md" style={{ border: "1px solid var(--line)" }}>
                  <Group justify="space-between" align="end" gap="md">
                    <div>
                      <Text fw={600}>{member.displayName}</Text>
                      {member.email ? (
                        <Text size="sm" c="dimmed">
                          {member.email}
                        </Text>
                      ) : null}
                      <Badge mt="xs" variant="light" color={currentRole ? "teal" : "gray"}>
                        {formatAccess(currentRole, dictionary)}
                      </Badge>
                    </div>
                    {canManage ? (
                      <Group align="end" gap="sm">
                        <Select
                          label={dictionary.moduleLabAccessTitle}
                          data={[
                            { value: "none", label: dictionary.moduleLabAccessNoAccess },
                            { value: "viewer", label: dictionary.moduleLabAccessViewer },
                            { value: "operator", label: dictionary.moduleLabAccessOperator },
                          ]}
                          value={draft}
                          onChange={(value) => {
                            setRoleDrafts((current) => ({
                              ...current,
                              [member.userId]: toAccessDraft(value),
                            }));
                          }}
                          allowDeselect={false}
                          w={{ base: "100%", sm: 180 }}
                        />
                        <Button
                          variant="light"
                          loading={savingUserId === member.userId}
                          disabled={draft === toAccessDraft(currentRole)}
                          onClick={() => {
                            void handleSave(member);
                          }}
                        >
                          {dictionary.moduleLabAccessSave}
                        </Button>
                      </Group>
                    ) : null}
                  </Group>
                </Card>
              );
            })}
          </Stack>
        ) : null}
      </Stack>
    </Card>
  );
}

function toAccessDraft(value: unknown): ModuleLabAccessDraft {
  if (value === "viewer" || value === "operator") {
    return value;
  }

  return "none";
}

function formatAccess(
  role: WorkspaceModuleRoleSummary["role"],
  dictionary: SiteDictionary["app"]["workspace"],
) {
  if (role === "viewer") {
    return dictionary.moduleLabAccessViewer;
  }

  if (role === "operator") {
    return dictionary.moduleLabAccessOperator;
  }

  return dictionary.moduleLabAccessNoAccess;
}
