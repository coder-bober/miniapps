import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Box, Button, Card, Container, Group, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";

import { SiteHeader } from "@/components/site-header";
import type { Locale } from "@/lib/i18n/config";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";
import { getModuleNavItems } from "@/modules/navigation";
import { getPublicModuleSurface } from "@/modules/registry";
import { isModuleEnabled } from "@/shared/modules/enabled-modules";
import type { AuthenticatedUser } from "@/types/auth";

type ModulePublicPageShellProps = {
  moduleId: string;
  locale: Locale;
  dictionary: SiteDictionary;
  user: AuthenticatedUser | null;
  children?: ReactNode;
};

export function ModulePublicPageShell({
  moduleId,
  locale,
  dictionary,
  user,
  children,
}: ModulePublicPageShellProps) {
  if (!isModuleEnabled(moduleId)) {
    notFound();
  }

  const marketingModuleLinks = getModuleNavItems("marketing", locale);
  const appModuleLinks = getModuleNavItems("app", locale);
  const publicSurface = getPublicModuleSurface(moduleId, dictionary);

  if (!publicSurface) {
    notFound();
  }

  return (
    <Box component="main" py={32}>
      <Container size={1180}>
        <Paper
          radius={28}
          p="xl"
          style={{
            background: "var(--surface)",
            backdropFilter: "blur(20px)",
            border: "1px solid var(--line)",
            boxShadow: "0 24px 80px rgba(17, 33, 45, 0.08)",
          }}
        >
          <Stack gap="xl">
            <SiteHeader
              dictionary={dictionary.header}
              locale={locale}
              user={user}
              marketingModuleLinks={marketingModuleLinks}
              appModuleLinks={appModuleLinks}
            />

            <Card
              radius={24}
              p={{ base: "lg", md: "xl" }}
              style={{
                background: "var(--surface-strong)",
                border: "1px solid var(--line)",
              }}
            >
              <Stack gap="md">
                <Badge variant="light" color="teal" radius="xl" w="fit-content">
                  {publicSurface.eyebrow}
                </Badge>
                <Title order={1}>{publicSurface.title}</Title>
                <Text size="lg" c="dimmed" maw={760}>
                  {publicSurface.description}
                </Text>
                <Group gap="md" mt="sm">
                  {user ? (
                    <Link href={`/${locale}/workspace`}>
                      <Button color="teal" component="span">
                        {dictionary.home.primaryCta}
                      </Button>
                    </Link>
                  ) : (
                    <>
                      <Link href={`/${locale}/sign-up`}>
                        <Button color="teal" component="span">
                          {dictionary.auth.signUp.submit}
                        </Button>
                      </Link>
                      <Link href={`/${locale}/sign-in`}>
                        <Button variant="default" component="span">
                          {dictionary.auth.signIn.submit}
                        </Button>
                      </Link>
                    </>
                  )}
                </Group>
              </Stack>
            </Card>

            <Card
              radius={24}
              p={{ base: "lg", md: "xl" }}
              style={{
                background: "var(--surface-strong)",
                border: "1px solid var(--line)",
              }}
            >
              <Stack gap="lg">
                <Title order={3}>{dictionary.app.shared.highlightsTitle}</Title>
                <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                  {publicSurface.highlights.map((item: string) => (
                    <Card
                      key={item}
                      radius={18}
                      p="lg"
                      style={{ border: "1px solid var(--line)" }}
                    >
                      <Text c="dimmed">{item}</Text>
                    </Card>
                  ))}
                </SimpleGrid>
              </Stack>
            </Card>

            {children}
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
