import { Alert, Button, Card, Stack, Text, TextInput, Title } from "@mantine/core";

import type { Locale } from "@/lib/i18n/config";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";
import type { AuthenticatedUser } from "@/types/auth";

type DeleteAccountCardProps = {
  locale: Locale;
  user: AuthenticatedUser;
  dictionary: SiteDictionary["app"]["settings"]["dangerZone"];
  action: (formData: FormData) => void | Promise<void>;
  error?: string;
  enabled?: boolean;
};

export function DeleteAccountCard({
  locale,
  user,
  dictionary,
  action,
  error,
  enabled = true,
}: DeleteAccountCardProps) {
  return (
    <Card
      radius={24}
      p={{ base: "lg", md: "xl" }}
      style={{
        background: "color-mix(in srgb, var(--surface-strong) 82%, #fee2e2)",
        border: "1px solid color-mix(in srgb, var(--line) 60%, #ef4444)",
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

        <form action={action}>
          <Stack gap="md">
            <input type="hidden" name="locale" value={locale} />
            <TextInput
              label={dictionary.confirmationLabel}
              name="confirmation"
              required
              autoComplete="email"
              placeholder={user.email ?? undefined}
              disabled={!enabled}
            />
            <Text size="sm" c="dimmed">
              {enabled ? dictionary.confirmationHelp : dictionary.unavailableNote}
            </Text>
            <Button type="submit" size="lg" color="red" mt="sm" disabled={!enabled}>
              {dictionary.submit}
            </Button>
          </Stack>
        </form>
      </Stack>
    </Card>
  );
}
