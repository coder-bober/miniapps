import { Alert, Button, Card, Stack, Text, TextInput, Title } from "@mantine/core";

import type { SiteDictionary } from "@/lib/i18n/dictionaries";
import type { AuthenticatedUser } from "@/types/auth";

type ProfileFormCardProps = {
  dictionary: SiteDictionary["app"]["profile"]["form"];
  locale: string;
  user: AuthenticatedUser;
  action: (formData: FormData) => void | Promise<void>;
  error?: string;
  message?: string;
};

export function ProfileFormCard({
  dictionary,
  locale,
  user,
  action,
  error,
  message,
}: ProfileFormCardProps) {
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
            <TextInput
              label={dictionary.emailLabel}
              value={user.email ?? ""}
              readOnly
              disabled
            />
            <TextInput
              label={dictionary.fullNameLabel}
              name="full_name"
              defaultValue={user.fullName ?? ""}
              autoComplete="name"
            />
            <TextInput
              label={dictionary.usernameLabel}
              name="username"
              defaultValue={user.username ?? ""}
              autoComplete="username"
            />
            <TextInput
              label={dictionary.avatarUrlLabel}
              name="avatar_url"
              defaultValue={user.avatarUrl ?? ""}
              autoComplete="url"
            />
            <Button type="submit" size="lg" color="teal" mt="sm">
              {dictionary.submit}
            </Button>
          </Stack>
        </form>
      </Stack>
    </Card>
  );
}
