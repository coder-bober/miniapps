import { Alert, Button, Card, Stack, Text, TextInput, Title } from "@mantine/core";
import Link from "next/link";

import type { Locale } from "@/lib/i18n/config";

type EmailActionCardProps = {
  locale: Locale;
  title: string;
  description: string;
  submitLabel: string;
  emailLabel: string;
  action: (formData: FormData) => void | Promise<void>;
  error?: string;
  message?: string;
  email?: string;
  footerLinks?: Array<{
    href: string;
    label: string;
  }>;
};

export function EmailActionCard({
  locale,
  title,
  description,
  submitLabel,
  emailLabel,
  action,
  error,
  message,
  email,
  footerLinks = [],
}: EmailActionCardProps) {
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
          <Title order={1}>{title}</Title>
          <Text c="dimmed" mt="xs">
            {description}
          </Text>
        </div>

        {error ? <Alert color="red">{error}</Alert> : null}
        {message ? <Alert color="teal">{message}</Alert> : null}

        <form action={action}>
          <Stack gap="md">
            <input type="hidden" name="locale" value={locale} />
            <TextInput
              label={emailLabel}
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={email ?? ""}
            />
            <Button type="submit" size="lg" color="teal">
              {submitLabel}
            </Button>
          </Stack>
        </form>

        {footerLinks.length ? (
          <Stack gap="xs">
            {footerLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{ color: "inherit", textDecoration: "underline" }}
              >
                {item.label}
              </Link>
            ))}
          </Stack>
        ) : null}
      </Stack>
    </Card>
  );
}
