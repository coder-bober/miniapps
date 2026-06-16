import { Alert, Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import Link from "next/link";

import type { Locale } from "@/lib/i18n/config";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";

type SessionManagementCardProps = {
  locale: Locale;
  dictionary: SiteDictionary["app"]["settings"]["sessions"];
  action: (formData: FormData) => void | Promise<void>;
  error?: string;
};

export function SessionManagementCard({
  locale,
  dictionary,
  action,
  error,
}: SessionManagementCardProps) {
  return (
    <Card
      radius={24}
      p={{ base: "lg", md: "xl" }}
      style={{
        background: "var(--surface-strong)",
        border: "1px solid var(--line)",
      }}
    >
      <Stack gap="lg">
        <div>
          <Title order={3}>{dictionary.title}</Title>
          <Text c="dimmed" mt="xs">
            {dictionary.description}
          </Text>
        </div>

        {error ? <Alert color="red">{error}</Alert> : null}

        <Group align="flex-start" grow>
          <Stack gap="xs">
            <Text fw={700}>{dictionary.currentSessionTitle}</Text>
            <Text c="dimmed">{dictionary.currentSessionDescription}</Text>
            <Group justify="flex-start" mt="sm">
              <Link href="/auth/sign-out" prefetch={false}>
                <Button component="span" color="dark" variant="default">
                  {dictionary.currentSessionSubmit}
                </Button>
              </Link>
            </Group>
          </Stack>
          <Stack gap="xs">
            <Text fw={700}>{dictionary.allSessionsTitle}</Text>
            <Text c="dimmed">{dictionary.allSessionsDescription}</Text>
            <form action={action}>
              <input type="hidden" name="locale" value={locale} />
              <Group justify="flex-start" mt="sm">
                <Button type="submit" color="teal">
                  {dictionary.allSessionsSubmit}
                </Button>
              </Group>
            </form>
          </Stack>
        </Group>
      </Stack>
    </Card>
  );
}
