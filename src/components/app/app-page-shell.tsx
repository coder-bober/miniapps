import { Badge, Box, Card, Container, Group, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

import { getAppNavigation } from "@/core/navigation/app-navigation";
import {
  WorkspaceShellProvider,
  WorkspaceShellSwitcher,
} from "@/core/workspaces/workspace-shell-context";
import { AppSectionNav } from "@/components/app/app-section-nav";
import { SiteHeader } from "@/components/site-header";
import type { Locale } from "@/lib/i18n/config";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";
import { getModuleNavItems } from "@/modules/navigation";
import type { AuthenticatedUser } from "@/types/auth";

type AppPageShellProps = {
  locale: Locale;
  dictionary: SiteDictionary;
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
  user: AuthenticatedUser;
  children?: ReactNode;
};

export function AppPageShell({
  locale,
  dictionary,
  eyebrow,
  title,
  description,
  highlights,
  user,
  children,
}: AppPageShellProps) {
  const appNavigation = getAppNavigation(locale, dictionary);
  const marketingModuleLinks = getModuleNavItems("marketing", locale);
  const appModuleLinks = getModuleNavItems("app", locale);

  return (
    <Box component="main" py={32}>
      <Container size={1180}>
        <WorkspaceShellProvider dictionary={dictionary.app.shared}>
          <Paper
            radius={28}
            p="xl"
            style={{
              background: "var(--surface)",
              backdropFilter: "blur(20px)",
              border: "1px solid var(--line)",
              boxShadow: "var(--panel-shadow)",
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
              <AppSectionNav items={appNavigation} />

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
                    {eyebrow}
                  </Badge>
                  <Title order={1}>{title}</Title>
                  <Text size="lg" c="dimmed" maw={760}>
                    {description}
                  </Text>

                  <Group gap="lg" mt="md" align="end">
                    <InfoStat label={dictionary.app.shared.localeLabel} value={locale.toUpperCase()} />
                    <InfoStat
                      label={dictionary.app.shared.surfaceLabel}
                      value={dictionary.app.shared.surfaceValue}
                    />
                    <InfoStat
                      label={dictionary.app.shared.modeLabel}
                      value={dictionary.app.shared.modeValue}
                    />
                    <WorkspaceShellSwitcher dictionary={dictionary.app.shared} />
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
                    {highlights.map((item) => (
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
        </WorkspaceShellProvider>
      </Container>
    </Box>
  );
}

type InfoStatProps = {
  label: string;
  value: string;
};

function InfoStat({ label, value }: InfoStatProps) {
  return (
    <div>
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text fw={700}>{value}</Text>
    </div>
  );
}
