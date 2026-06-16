"use client";

import { Anchor, Card, Group } from "@mantine/core";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { AppNavigationItem } from "@/core/navigation/app-navigation";
import { useWorkspaceShellContext } from "@/core/workspaces/workspace-shell-context";

type AppSectionNavProps = {
  items: AppNavigationItem[];
};

export function AppSectionNav({ items }: AppSectionNavProps) {
  const pathname = usePathname();
  const { currentWorkspace } = useWorkspaceShellContext();

  return (
    <Card
      radius={24}
      p={{ base: "md", md: "lg" }}
      style={{
        background: "var(--surface-strong)",
        border: "1px solid var(--line)",
      }}
    >
      <Group gap="sm">
        {items.map((item) => {
          const href = resolveWorkspaceAwareHref(item, currentWorkspace?.id ?? null);
          const isActive = pathname === href.split("?")[0];

          return (
            <Anchor
              key={item.id}
              component={Link}
              href={href}
              underline="never"
              c={isActive ? "teal" : "dimmed"}
              fw={isActive ? 700 : 500}
              px="md"
              py={8}
              style={{
                borderRadius: 999,
                border: "1px solid var(--line)",
                background: isActive ? "rgba(18, 184, 134, 0.12)" : "var(--surface)",
              }}
            >
              {item.label}
            </Anchor>
          );
        })}
      </Group>
    </Card>
  );
}

function resolveWorkspaceAwareHref(item: AppNavigationItem, workspaceId: string | null) {
  if (item.id !== "module-lab" || !workspaceId) {
    return item.href;
  }

  const [path, query = ""] = item.href.split("?");
  const params = new URLSearchParams(query);
  params.set("bbb", workspaceId);
  const serializedParams = params.toString();

  return serializedParams ? `${path}?${serializedParams}` : path;
}
