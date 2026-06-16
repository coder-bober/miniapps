import { Alert, Button, Card, PasswordInput, Stack, Text, Title } from "@mantine/core";
import Link from "next/link";

import type { Locale } from "@/lib/i18n/config";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";

type ResetPasswordCardProps = {
  locale: Locale;
  dictionary: SiteDictionary["auth"];
  action: (formData: FormData) => void | Promise<void>;
  error?: string;
  message?: string;
};

export function ResetPasswordCard({
  locale,
  dictionary,
  action,
  error,
  message,
}: ResetPasswordCardProps) {
  return (
    <Card
      radius={24}
      p="xl"
      style={{
        background: "var(--surface-strong)",
        border: "1px solid var(--line)",
      }}
    >
      <Stack gap="lg">
        <div>
          <Title order={1}>{dictionary.resetPassword.title}</Title>
          <Text c="dimmed" mt="xs">
            {dictionary.resetPassword.description}
          </Text>
        </div>

        {error ? <Alert color="red">{error}</Alert> : null}
        {message ? <Alert color="teal">{message}</Alert> : null}

        <form action={action}>
          <Stack gap="md">
            <input type="hidden" name="locale" value={locale} />
            <PasswordInput
              label={dictionary.fields.newPassword}
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <Button type="submit" size="lg" color="teal">
              {dictionary.resetPassword.submit}
            </Button>
          </Stack>
        </form>

        <Link href={`/${locale}/forgot-password`} style={{ color: "inherit", textDecoration: "underline" }}>
          {dictionary.actions.backToForgotPassword}
        </Link>
      </Stack>
    </Card>
  );
}
