"use client";

import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
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

type WorkspaceMembersCardProps = {
  dictionary: SiteDictionary["app"]["workspace"];
  sharedDictionary: SiteDictionary["app"]["shared"];
};

export function WorkspaceMembersCard({
  dictionary,
  sharedDictionary,
}: WorkspaceMembersCardProps) {
  const { currentWorkspace } = useWorkspaceShellContext();
  const [members, setMembers] = useState<WorkspaceMemberSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<"admin" | "member">("member");
  const [adding, setAdding] = useState(false);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, "admin" | "member">>({});
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [transferOpened, setTransferOpened] = useState(false);
  const [newOwnerUserId, setNewOwnerUserId] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);

  const isOwner = currentWorkspace?.membershipRole === "owner";

  const loadMembers = useCallback(async () => {
    if (!currentWorkspace || currentWorkspace.kind !== "shared" || !currentWorkspace.id) {
      setMembers([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/workspaces/${encodeURIComponent(currentWorkspace.id)}/members`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | { members?: WorkspaceMemberSummary[]; message?: string }
        | null;

      if (!response.ok) {
        setMembers([]);
        setError(payload?.message ?? dictionary.membersLoadFailed);
        return;
      }

      setMembers(payload?.members ?? []);
    } catch {
      setMembers([]);
      setError(dictionary.membersLoadFailed);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, dictionary.membersLoadFailed]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadMembers();
    });
  }, [loadMembers]);

  useEffect(() => {
    queueMicrotask(() => {
      setFeedback(null);
      setError(null);
      setRoleDrafts({});
      setAddEmail("");
      setAddRole("member");
      setTransferOpened(false);
      setNewOwnerUserId(null);
    });
  }, [currentWorkspace?.id]);

  const transferableMembers = useMemo(
    () => members.filter((member) => member.role !== "owner"),
    [members],
  );

  if (!currentWorkspace) {
    return null;
  }

  if (currentWorkspace.kind !== "shared") {
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
            <Title order={3}>{dictionary.membersTitle}</Title>
            <Text c="dimmed" mt="xs">
              {dictionary.membersDescription}
            </Text>
          </div>
          <Alert color="blue">{dictionary.membersPersonalNotice}</Alert>
        </Stack>
      </Card>
    );
  }

  async function handleAddMember() {
    if (!currentWorkspace?.id) {
      return;
    }

    setAdding(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(`/api/workspaces/${encodeURIComponent(currentWorkspace.id)}/members`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: addEmail,
          role: addRole,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        setError(payload?.message ?? dictionary.membersLoadFailed);
        return;
      }

      setAddEmail("");
      setAddRole("member");
      setFeedback(dictionary.membersAddSuccess);
      await loadMembers();
    } catch {
      setError(dictionary.membersLoadFailed);
    } finally {
      setAdding(false);
    }
  }

  async function handleSaveRole(member: WorkspaceMemberSummary) {
    if (!currentWorkspace?.id) {
      return;
    }

    const nextRole = roleDrafts[member.userId] ?? member.role;

    if (nextRole === member.role) {
      return;
    }

    setUpdatingUserId(member.userId);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(
        `/api/workspaces/${encodeURIComponent(currentWorkspace.id)}/members/${encodeURIComponent(member.userId)}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            role: nextRole,
          }),
        },
      );
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        setError(payload?.message ?? dictionary.membersLoadFailed);
        return;
      }

      setFeedback(dictionary.membersRoleUpdateSuccess);
      await loadMembers();
    } catch {
      setError(dictionary.membersLoadFailed);
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function handleRemoveMember(member: WorkspaceMemberSummary) {
    if (!currentWorkspace?.id) {
      return;
    }

    setRemovingUserId(member.userId);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(
        `/api/workspaces/${encodeURIComponent(currentWorkspace.id)}/members/${encodeURIComponent(member.userId)}`,
        {
          method: "DELETE",
        },
      );
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        setError(payload?.message ?? dictionary.membersLoadFailed);
        return;
      }

      setFeedback(dictionary.membersRemoveSuccess);
      await loadMembers();
    } catch {
      setError(dictionary.membersLoadFailed);
    } finally {
      setRemovingUserId(null);
    }
  }

  async function handleTransferOwnership() {
    if (!currentWorkspace?.id || !newOwnerUserId) {
      return;
    }

    setTransferring(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(
        `/api/workspaces/${encodeURIComponent(currentWorkspace.id)}/members/transfer-owner`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            newOwnerUserId,
          }),
        },
      );
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        setError(payload?.message ?? dictionary.membersLoadFailed);
        return;
      }

      setTransferOpened(false);
      setNewOwnerUserId(null);
      setFeedback(dictionary.membersTransferSuccess);
      await loadMembers();
    } catch {
      setError(dictionary.membersLoadFailed);
    } finally {
      setTransferring(false);
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
          <Title order={3}>{dictionary.membersTitle}</Title>
          <Text c="dimmed" mt="xs">
            {dictionary.membersDescription}
          </Text>
        </div>

        <Alert color="teal">{dictionary.membersOwnerOnlyNotice}</Alert>
        {error ? <Alert color="red">{error}</Alert> : null}
        {feedback ? <Alert color="teal">{feedback}</Alert> : null}

        {isOwner ? (
          <Card radius={18} p="md" style={{ border: "1px solid var(--line)" }}>
            <Stack gap="sm">
              <Title order={4}>{dictionary.membersAddTitle}</Title>
              <TextInput
                label={dictionary.membersAddEmailLabel}
                placeholder={dictionary.membersAddEmailPlaceholder}
                value={addEmail}
                onChange={(event) => setAddEmail(event.currentTarget.value)}
              />
              <Select
                label={dictionary.membersAddRoleLabel}
                data={[
                  { value: "member", label: sharedDictionary.workspaceRoleMember },
                  { value: "admin", label: sharedDictionary.workspaceRoleAdmin },
                ]}
                value={addRole}
                onChange={(value) => setAddRole(value === "admin" ? "admin" : "member")}
                allowDeselect={false}
              />
              <Group justify="flex-end">
                <Button color="teal" loading={adding} onClick={handleAddMember}>
                  {dictionary.membersAddSubmit}
                </Button>
              </Group>
            </Stack>
          </Card>
        ) : null}

        {loading ? <Text c="dimmed">{dictionary.membersLoading}</Text> : null}
        {!loading && members.length === 0 ? <Text c="dimmed">{dictionary.membersEmpty}</Text> : null}

        {!loading && members.length > 0 ? (
          <Stack gap="sm">
            {members.map((member) => {
              const draftRole = roleDrafts[member.userId] ?? (member.role === "owner" ? "member" : member.role);
              const canEditMember = isOwner && member.role !== "owner";

              return (
                <Card key={member.membershipId} radius={18} p="md" style={{ border: "1px solid var(--line)" }}>
                  <Stack gap="sm">
                    <Group justify="space-between" align="start" gap="md">
                      <div>
                        <Text fw={600}>{member.displayName}</Text>
                        {member.email ? (
                          <Text size="sm" c="dimmed">
                            {member.email}
                          </Text>
                        ) : null}
                      </div>
                      <Badge
                        variant="light"
                        color={member.role === "owner" ? "teal" : member.role === "admin" ? "blue" : "gray"}
                      >
                        {formatWorkspaceRole(member.role, sharedDictionary)}
                      </Badge>
                    </Group>

                    {canEditMember ? (
                      <Group align="end" gap="sm">
                        <Select
                          label={dictionary.membersAddRoleLabel}
                          data={[
                            { value: "member", label: sharedDictionary.workspaceRoleMember },
                            { value: "admin", label: sharedDictionary.workspaceRoleAdmin },
                          ]}
                          value={draftRole}
                          onChange={(value) => {
                            setRoleDrafts((current) => ({
                              ...current,
                              [member.userId]: value === "admin" ? "admin" : "member",
                            }));
                          }}
                          allowDeselect={false}
                          w={{ base: "100%", sm: 180 }}
                        />
                        <Button
                          variant="light"
                          loading={updatingUserId === member.userId}
                          disabled={draftRole === member.role}
                          onClick={() => {
                            void handleSaveRole(member);
                          }}
                        >
                          {dictionary.membersRoleSave}
                        </Button>
                        <Button
                          color="red"
                          variant="light"
                          loading={removingUserId === member.userId}
                          onClick={() => {
                            void handleRemoveMember(member);
                          }}
                        >
                          {dictionary.membersRemoveSubmit}
                        </Button>
                      </Group>
                    ) : null}
                  </Stack>
                </Card>
              );
            })}
          </Stack>
        ) : null}

        {isOwner && transferableMembers.length > 0 ? (
          <>
            <Card radius={18} p="md" style={{ border: "1px solid var(--line)" }}>
              <Stack gap="sm">
                <Title order={4}>{dictionary.membersTransferTitle}</Title>
                <Text c="dimmed">{dictionary.membersTransferDescription}</Text>
                <Group justify="flex-end">
                  <Button variant="light" color="teal" onClick={() => setTransferOpened(true)}>
                    {dictionary.membersTransferSubmit}
                  </Button>
                </Group>
              </Stack>
            </Card>
            <Modal
              opened={transferOpened}
              onClose={() => setTransferOpened(false)}
              title={dictionary.membersTransferTitle}
              centered
            >
              <Stack gap="md">
                <Text c="dimmed">{dictionary.membersTransferDescription}</Text>
                <Select
                  label={dictionary.membersTransferLabel}
                  data={transferableMembers.map((member) => ({
                    value: member.userId,
                    label: member.email ? `${member.displayName} (${member.email})` : member.displayName,
                  }))}
                  value={newOwnerUserId}
                  onChange={setNewOwnerUserId}
                  allowDeselect={false}
                />
                <Group justify="flex-end">
                  <Button variant="default" onClick={() => setTransferOpened(false)}>
                    {sharedDictionary.workspaceCreateCancel}
                  </Button>
                  <Button
                    color="teal"
                    loading={transferring}
                    disabled={!newOwnerUserId}
                    onClick={() => {
                      void handleTransferOwnership();
                    }}
                  >
                    {dictionary.membersTransferSubmit}
                  </Button>
                </Group>
              </Stack>
            </Modal>
          </>
        ) : null}
      </Stack>
    </Card>
  );
}

function formatWorkspaceRole(
  role: WorkspaceMemberSummary["role"],
  dictionary: SiteDictionary["app"]["shared"],
) {
  if (role === "owner") {
    return dictionary.workspaceRoleOwner;
  }

  if (role === "admin") {
    return dictionary.workspaceRoleAdmin;
  }

  return dictionary.workspaceRoleMember;
}
