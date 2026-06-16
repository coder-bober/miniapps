import { Alert, Button, Card, PasswordInput, Stack, Text, Title } from "@mantine/core";

import type { Locale } from "@/lib/i18n/config";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";

type ChangePasswordCardProps = {
  locale: Locale;
  dictionary: SiteDictionary["app"]["settings"]["security"];
  action: (formData: FormData) => void | Promise<void>;
  error?: string;
  message?: string;
};

export function ChangePasswordCard({
  locale,
  dictionary,
  action,
  error,
  message,
}: ChangePasswordCardProps) {
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
        {message ? <Alert color="teal">{message}</Alert> : null}

        <form action={action}>
          <Stack gap="md">
            <input type="hidden" name="locale" value={locale} />
            <PasswordInput
              label={dictionary.newPasswordLabel}
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <PasswordInput
              label={dictionary.confirmPasswordLabel}
              name="confirm_password"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <Text size="sm" c="dimmed">
              {dictionary.helper}
            </Text>
            <Button type="submit" size="lg" color="teal" mt="sm">
              {dictionary.submit}
            </Button>
          </Stack>
        </form>
      </Stack>
    </Card>
  );
}
