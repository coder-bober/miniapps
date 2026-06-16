"use client";

import { Anchor, Card, Group } from "@mantine/core";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { AppNavigationItem } from "@/core/navigation/app-navigation";

type AppSectionNavProps = {
  items: AppNavigationItem[];
};

export function AppSectionNav({ items }: AppSectionNavProps) {
  const pathname = usePathname();

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
          const isActive = pathname === item.href;

          return (
            <Anchor
              key={item.id}
              component={Link}
              href={item.href}
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
