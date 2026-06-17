"use client";

import { Alert, Badge, Button, Card, Group, Stack, Table, Text, Title } from "@mantine/core";
import Link from "next/link";

import { useWorkspaceShellContext, type WorkspaceSummary } from "@/core/workspaces/workspace-shell-context";
import type { Locale } from "@/lib/i18n/config";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";
import { AdminWorkspaceAccessCard } from "./admin-workspace-access-card";

type WorkspaceAccessOverviewCardProps = {
  dictionary: SiteDictionary["app"]["workspace"];
  sharedDictionary: SiteDictionary["app"]["shared"];
  locale: Locale;
  isAppAdmin: boolean;
  moduleLabEnabled: boolean;
};

export function WorkspaceAccessOverviewCard({
  dictionary,
  sharedDictionary,
  locale,
  isAppAdmin,
  moduleLabEnabled,
}: WorkspaceAccessOverviewCardProps) {
  const { currentWorkspace, workspaces } = useWorkspaceShellContext();

  if (currentWorkspace?.kind !== "personal") {
    return null;
  }

  const visibleWorkspaces = workspaces.slice(0, 10);
  const sharedWorkspaceCount = visibleWorkspaces.filter((workspace) => workspace.kind === "shared").length;

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
          <Title order={3}>{dictionary.workspaceAccessTitle}</Title>
          <Text c="dimmed" mt="xs">
            {dictionary.workspaceAccessDescription}
          </Text>
        </div>

        <Alert color="blue">{dictionary.workspaceAccessPersonalOnlyNotice}</Alert>

        {sharedWorkspaceCount === 0 ? (
          <Text c="dimmed">{dictionary.workspaceAccessEmpty}</Text>
        ) : (
          <Table.ScrollContainer minWidth={620}>
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{dictionary.workspaceAccessNameColumn}</Table.Th>
                  <Table.Th>{dictionary.workspaceAccessKindColumn}</Table.Th>
                  <Table.Th>{dictionary.workspaceAccessRoleColumn}</Table.Th>
                  <Table.Th ta="right">{dictionary.workspaceAccessActionColumn}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {visibleWorkspaces.map((workspace) => (
                  <Table.Tr key={workspace.id ?? workspace.slug}>
                    <Table.Td>
                      <Text fw={600}>{workspace.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={workspace.kind === "shared" ? "teal" : "gray"}>
                        {formatWorkspaceKind(workspace, sharedDictionary)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{formatWorkspaceRole(workspace, sharedDictionary)}</Table.Td>
                    <Table.Td>
                      <Group justify="flex-end">
                        <Button
                          component={Link}
                          href={getWorkspaceHref(locale, workspace)}
                          variant="light"
                          color="teal"
                          size="xs"
                        >
                          {dictionary.workspaceAccessOpenAction}
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}

        {isAppAdmin ? (
          <AdminWorkspaceAccessCard
            dictionary={dictionary}
            sharedDictionary={sharedDictionary}
            moduleLabEnabled={moduleLabEnabled}
          />
        ) : null}
      </Stack>
    </Card>
  );
}

function getWorkspaceHref(locale: Locale, workspace: WorkspaceSummary) {
  if (!workspace.id) {
    return `/${locale}/workspace`;
  }

  return `/${locale}/workspace?bbb=${encodeURIComponent(workspace.id)}`;
}

function formatWorkspaceKind(
  workspace: WorkspaceSummary,
  dictionary: SiteDictionary["app"]["shared"],
) {
  return workspace.kind === "shared" ? dictionary.workspaceKindShared : dictionary.workspaceKindPersonal;
}

function formatWorkspaceRole(
  workspace: WorkspaceSummary,
  dictionary: SiteDictionary["app"]["shared"],
) {
  if (workspace.membershipRole === "owner") {
    return dictionary.workspaceRoleOwner;
  }

  if (workspace.membershipRole === "admin") {
    return dictionary.workspaceRoleAdmin;
  }

  return dictionary.workspaceRoleMember;
}
