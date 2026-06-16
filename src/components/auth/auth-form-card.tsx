import { Alert, Button, Card, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import Link from "next/link";

import type { Locale } from "@/lib/i18n/config";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";

type AuthFormCardProps = {
  locale: Locale;
  dictionary: SiteDictionary["auth"];
  mode: "sign-in" | "sign-up";
  action: (formData: FormData) => void | Promise<void>;
  error?: string;
  message?: string;
};

export function AuthFormCard({
  locale,
  dictionary,
  mode,
  action,
  error,
  message,
}: AuthFormCardProps) {
  const copy = mode === "sign-in" ? dictionary.signIn : dictionary.signUp;
  const switchHref = mode === "sign-in" ? `/${locale}/sign-up` : `/${locale}/sign-in`;
  const switchLabel =
    mode === "sign-in" ? dictionary.signIn.switchAction : dictionary.signUp.switchAction;
  const forgotPasswordHref = `/${locale}/forgot-password`;

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
          <Title order={1}>{copy.title}</Title>
          <Text c="dimmed" mt="xs">
            {copy.description}
          </Text>
        </div>

        {error ? <Alert color="red">{error}</Alert> : null}
        {message ? <Alert color="teal">{message}</Alert> : null}

        <form action={action}>
          <Stack gap="md">
            <input type="hidden" name="locale" value={locale} />
            <TextInput
              label={dictionary.fields.email}
              name="email"
              type="email"
              required
              autoComplete="email"
            />
            <PasswordInput
              label={dictionary.fields.password}
              name="password"
              required
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            />
            <Button type="submit" size="lg" color="teal" mt="sm">
              {copy.submit}
            </Button>
          </Stack>
        </form>

        {mode === "sign-in" ? (
          <Text size="sm" c="dimmed">
            <Link
              href={forgotPasswordHref}
              style={{ color: "inherit", textDecoration: "underline" }}
            >
              {dictionary.actions.forgotPassword}
            </Link>
          </Text>
        ) : null}

        <Text size="sm" c="dimmed">
          {copy.switchPrompt}{" "}
          <Link href={switchHref} style={{ color: "inherit", textDecoration: "underline" }}>
            {switchLabel}
          </Link>
        </Text>
      </Stack>
    </Card>
  );
}
