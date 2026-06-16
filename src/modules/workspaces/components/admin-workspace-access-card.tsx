"use client";

import {
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { SiteDictionary } from "@/lib/i18n/dictionaries";

type AdminWorkspaceSummary = {
  id: string;
  slug: string;
  name: string;
  kind: "personal" | "shared";
  createdAt: string;
};

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

type AdminWorkspaceAccessCardProps = {
  dictionary: SiteDictionary["app"]["workspace"];
  sharedDictionary: SiteDictionary["app"]["shared"];
};

type ModuleAccessDraft = "none" | "viewer" | "operator";

export function AdminWorkspaceAccessCard({
  dictionary,
  sharedDictionary,
}: AdminWorkspaceAccessCardProps) {
  const [workspaces, setWorkspaces] = useState<AdminWorkspaceSummary[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [members, setMembers] = useState<WorkspaceMemberSummary[]>([]);
  const [moduleRoles, setModuleRoles] = useState<WorkspaceModuleRoleSummary[]>([]);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, "admin" | "member">>({});
  const [moduleRoleDrafts, setModuleRoleDrafts] = useState<Record<string, ModuleAccessDraft>>({});
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [updatingModuleUserId, setUpdatingModuleUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? null,
    [selectedWorkspaceId, workspaces],
  );

  const moduleRoleByUserId = useMemo(() => {
    const roleMap = new Map<string, WorkspaceModuleRoleSummary["role"]>();

    for (const moduleRole of moduleRoles) {
      roleMap.set(moduleRole.userId, moduleRole.role);
    }

    return roleMap;
  }, [moduleRoles]);

  const loadWorkspaces = useCallback(async () => {
    setLoadingWorkspaces(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/workspaces?limit=10", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | { workspaces?: AdminWorkspaceSummary[]; message?: string }
        | null;

      if (!response.ok) {
        setWorkspaces([]);
        setSelectedWorkspaceId(null);
        setError(payload?.message ?? dictionary.adminWorkspaceLoadFailed);
        return;
      }

      const nextWorkspaces = payload?.workspaces ?? [];
      setWorkspaces(nextWorkspaces);
      setSelectedWorkspaceId((current) => current ?? nextWorkspaces[0]?.id ?? null);
    } catch {
      setWorkspaces([]);
      setSelectedWorkspaceId(null);
      setError(dictionary.adminWorkspaceLoadFailed);
    } finally {
      setLoadingWorkspaces(false);
    }
  }, [dictionary.adminWorkspaceLoadFailed]);

  const loadWorkspaceDetails = useCallback(async () => {
    if (!selectedWorkspaceId) {
      setMembers([]);
      setModuleRoles([]);
      return;
    }

    setLoadingDetails(true);
    setError(null);

    try {
      const [membersResponse, moduleRolesResponse] = await Promise.all([
        fetch(`/api/admin/workspaces/${encodeURIComponent(selectedWorkspaceId)}/members`, {
          method: "GET",
          cache: "no-store",
        }),
        fetch(`/api/admin/workspaces/${encodeURIComponent(selectedWorkspaceId)}/module-roles/module-lab`, {
          method: "GET",
          cache: "no-store",
        }),
      ]);
      const membersPayload = (await membersResponse.json().catch(() => null)) as
        | { members?: WorkspaceMemberSummary[]; message?: string }
        | null;
      const moduleRolesPayload = (await moduleRolesResponse.json().catch(() => null)) as
        | { moduleRoles?: WorkspaceModuleRoleSummary[]; message?: string }
        | null;

      if (!membersResponse.ok) {
        setMembers([]);
        setError(membersPayload?.message ?? dictionary.adminWorkspaceLoadFailed);
        return;
      }

      if (!moduleRolesResponse.ok) {
        setModuleRoles([]);
        setError(moduleRolesPayload?.message ?? dictionary.adminWorkspaceLoadFailed);
        return;
      }

      setMembers(membersPayload?.members ?? []);
      setModuleRoles(moduleRolesPayload?.moduleRoles ?? []);
      setRoleDrafts({});
      setModuleRoleDrafts({});
    } catch {
      setMembers([]);
      setModuleRoles([]);
      setError(dictionary.adminWorkspaceLoadFailed);
    } finally {
      setLoadingDetails(false);
    }
  }, [dictionary.adminWorkspaceLoadFailed, selectedWorkspaceId]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadWorkspaces();
    });
  }, [loadWorkspaces]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadWorkspaceDetails();
    });
  }, [loadWorkspaceDetails]);

  async function handleSaveMemberRole(member: WorkspaceMemberSummary) {
    if (!selectedWorkspaceId) {
      return;
    }

    const nextRole = roleDrafts[member.userId] ?? (member.role === "owner" ? "member" : member.role);

    if (nextRole === member.role || member.role === "owner") {
      return;
    }

    setUpdatingMemberId(member.userId);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(
        `/api/admin/workspaces/${encodeURIComponent(selectedWorkspaceId)}/members/${encodeURIComponent(member.userId)}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ role: nextRole }),
        },
      );
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        setError(payload?.message ?? dictionary.adminWorkspaceUpdateFailed);
        return;
      }

      setFeedback(dictionary.adminWorkspaceUpdateSuccess);
      await loadWorkspaceDetails();
    } catch {
      setError(dictionary.adminWorkspaceUpdateFailed);
    } finally {
      setUpdatingMemberId(null);
    }
  }

  async function handleSaveModuleRole(member: WorkspaceMemberSummary) {
    if (!selectedWorkspaceId) {
      return;
    }

    const currentRole = moduleRoleByUserId.get(member.userId) ?? null;
    const nextRole = moduleRoleDrafts[member.userId] ?? (currentRole ?? "none");

    if ((nextRole === "none" && currentRole === null) || nextRole === currentRole) {
      return;
    }

    setUpdatingModuleUserId(member.userId);
    setError(null);
    setFeedback(null);

    try {
      const response =
        nextRole === "none"
          ? await fetch(
              `/api/admin/workspaces/${encodeURIComponent(selectedWorkspaceId)}/module-roles/module-lab/${encodeURIComponent(member.userId)}`,
              {
                method: "DELETE",
              },
            )
          : await fetch(
              `/api/admin/workspaces/${encodeURIComponent(selectedWorkspaceId)}/module-roles/module-lab/${encodeURIComponent(member.userId)}`,
              {
                method: "PATCH",
                headers: {
                  "content-type": "application/json",
                },
                body: JSON.stringify({ role: nextRole }),
              },
            );
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        setError(payload?.message ?? dictionary.adminWorkspaceUpdateFailed);
        return;
      }

      setFeedback(dictionary.adminWorkspaceUpdateSuccess);
      await loadWorkspaceDetails();
    } catch {
      setError(dictionary.adminWorkspaceUpdateFailed);
    } finally {
      setUpdatingModuleUserId(null);
    }
  }

  return (
    <>
      <Divider />
      <Stack gap="md">
        <div>
          <Title order={4}>{dictionary.adminWorkspaceToolsTitle}</Title>
          <Text c="dimmed" mt="xs">
            {dictionary.adminWorkspaceToolsDescription}
          </Text>
        </div>

        {error ? <Alert color="red">{error}</Alert> : null}
        {feedback ? <Alert color="teal">{feedback}</Alert> : null}

        <Group align="end" gap="sm">
          <Select
            label={dictionary.adminWorkspaceSelectLabel}
            data={workspaces.map((workspace) => ({
              value: workspace.id,
              label: `${workspace.name} (${workspace.kind})`,
            }))}
            value={selectedWorkspaceId}
            onChange={setSelectedWorkspaceId}
            disabled={loadingWorkspaces || workspaces.length === 0}
            allowDeselect={false}
            w={{ base: "100%", sm: 320 }}
          />
          <Button variant="light" color="teal" loading={loadingWorkspaces} onClick={loadWorkspaces}>
            {dictionary.adminWorkspaceRefresh}
          </Button>
        </Group>

        {selectedWorkspace ? (
          <Group gap="xs">
            <Badge variant="light" color={selectedWorkspace.kind === "shared" ? "teal" : "gray"}>
              {selectedWorkspace.kind === "shared"
                ? sharedDictionary.workspaceKindShared
                : sharedDictionary.workspaceKindPersonal}
            </Badge>
            <Text size="sm" c="dimmed">
              {selectedWorkspace.slug}
            </Text>
          </Group>
        ) : null}

        {loadingDetails ? <Text c="dimmed">{dictionary.adminWorkspaceLoading}</Text> : null}
        {!loadingDetails && selectedWorkspaceId && members.length === 0 ? (
          <Text c="dimmed">{dictionary.adminWorkspaceMembersEmpty}</Text>
        ) : null}

        {!loadingDetails && members.length > 0 ? (
          <Table.ScrollContainer minWidth={760}>
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{dictionary.workspaceAccessNameColumn}</Table.Th>
                  <Table.Th>{dictionary.workspaceAccessRoleColumn}</Table.Th>
                  <Table.Th>{dictionary.moduleLabAccessTitle}</Table.Th>
                  <Table.Th ta="right">{dictionary.workspaceAccessActionColumn}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {members.map((member) => {
                  const currentModuleRole = moduleRoleByUserId.get(member.userId) ?? null;
                  const moduleDraft = moduleRoleDrafts[member.userId] ?? (currentModuleRole ?? "none");
                  const memberDraft = roleDrafts[member.userId] ?? (member.role === "owner" ? "member" : member.role);
                  const canEditMemberRole = member.role !== "owner";
                  const roleChanged = canEditMemberRole && memberDraft !== member.role;
                  const moduleChanged =
                    (moduleDraft === "none" ? null : moduleDraft) !== currentModuleRole;

                  return (
                    <Table.Tr key={member.membershipId}>
                      <Table.Td>
                        <Text fw={600}>{member.displayName}</Text>
                        {member.email ? (
                          <Text size="sm" c="dimmed">
                            {member.email}
                          </Text>
                        ) : null}
                      </Table.Td>
                      <Table.Td>
                        {canEditMemberRole ? (
                          <Select
                            data={[
                              { value: "member", label: sharedDictionary.workspaceRoleMember },
                              { value: "admin", label: sharedDictionary.workspaceRoleAdmin },
                            ]}
                            value={memberDraft}
                            onChange={(value) => {
                              setRoleDrafts((current) => ({
                                ...current,
                                [member.userId]: value === "admin" ? "admin" : "member",
                              }));
                            }}
                            allowDeselect={false}
                            w={150}
                          />
                        ) : (
                          sharedDictionary.workspaceRoleOwner
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Select
                          data={[
                            { value: "none", label: dictionary.moduleLabAccessNoAccess },
                            { value: "viewer", label: dictionary.moduleLabAccessViewer },
                            { value: "operator", label: dictionary.moduleLabAccessOperator },
                          ]}
                          value={moduleDraft}
                          onChange={(value) => {
                            setModuleRoleDrafts((current) => ({
                              ...current,
                              [member.userId]:
                                value === "operator" ? "operator" : value === "viewer" ? "viewer" : "none",
                            }));
                          }}
                          allowDeselect={false}
                          w={170}
                        />
                      </Table.Td>
                      <Table.Td>
                        <Group justify="flex-end" gap="xs">
                          {canEditMemberRole ? (
                            <Button
                              variant="light"
                              size="xs"
                              disabled={!roleChanged}
                              loading={updatingMemberId === member.userId}
                              onClick={() => {
                                void handleSaveMemberRole(member);
                              }}
                            >
                              {dictionary.membersRoleSave}
                            </Button>
                          ) : null}
                          <Button
                            variant="light"
                            color="teal"
                            size="xs"
                            disabled={!moduleChanged}
                            loading={updatingModuleUserId === member.userId}
                            onClick={() => {
                              void handleSaveModuleRole(member);
                            }}
                          >
                            {dictionary.moduleLabAccessSave}
                          </Button>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        ) : null}
      </Stack>
    </>
  );
}
