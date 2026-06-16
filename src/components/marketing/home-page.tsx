import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconBolt,
  IconChartBar,
  IconChecklist,
  IconShieldCheck,
} from "@tabler/icons-react";

import { SiteHeader } from "@/components/site-header";
import type { AuthenticatedUser } from "@/types/auth";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { siteUrl } from "@/lib/i18n/config";
import { getModuleNavItems } from "@/modules/navigation";
import { getMarketingSchemas } from "@/lib/seo/schema";

type HomePageProps = {
  dictionary: SiteDictionary;
  locale: Locale;
  user: AuthenticatedUser | null;
};

export function HomePage({ dictionary, locale, user }: HomePageProps) {
  const marketingModuleLinks = getModuleNavItems("marketing", locale);
  const appModuleLinks = getModuleNavItems("app", locale);
  const featureCards = [
    {
      ...dictionary.home.features[0],
      icon: IconChartBar,
    },
    {
      ...dictionary.home.features[1],
      icon: IconBolt,
    },
    {
      ...dictionary.home.features[2],
      icon: IconShieldCheck,
    },
  ];
  const schemas = getMarketingSchemas(locale, siteUrl, dictionary);

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={`${locale}-schema-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <Box component="main" py={32}>
        <Container size={1380}>
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

              <div
                id="product"
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "1.5rem",
                  alignItems: "stretch",
                }}
              >
              <Stack
                justify="center"
                gap="lg"
                h="100%"
                style={{ flex: "1.35 1 720px", minWidth: 0 }}
              >
                <Badge variant="light" color="teal" radius="xl" size="lg" w="fit-content">
                  {dictionary.home.badge}
                </Badge>
                <Title
                  order={1}
                  maw={860}
                  lh={1}
                  style={{ fontSize: "clamp(3rem, 6vw, 5.5rem)" }}
                >
                  {dictionary.home.heroTitle}
                </Title>
                <Text size="xl" c="dimmed" maw={720}>
                  {dictionary.home.heroDescription}
                </Text>
                <Group gap="md">
                  {user ? (
                    <Button size="xl" color="teal" component="a" href={`/${locale}/workspace`}>
                      {dictionary.home.primaryCta}
                    </Button>
                  ) : (
                    <>
                      <Button size="xl" color="teal" component="a" href={`/${locale}/sign-up`}>
                        {dictionary.auth.signUp.submit}
                      </Button>
                      <Button size="xl" variant="default" component="a" href={`/${locale}/sign-in`}>
                        {dictionary.auth.signIn.submit}
                      </Button>
                    </>
                  )}
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" id="metrics">
                  {dictionary.home.stats.map((stat) => (
                    <Stat
                      key={stat.label}
                      label={stat.label}
                      value={stat.value}
                      detail={stat.detail}
                    />
                  ))}
                </SimpleGrid>
              </Stack>

              <div style={{ flex: "0.95 1 440px", minWidth: 0 }}>
                <Card
                  radius={24}
                  p="xl"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(12, 30, 40, 0.98), rgba(21, 52, 57, 0.92))",
                    color: "white",
                    boxShadow: "0 28px 60px rgba(17, 33, 45, 0.24)",
                  }}
                >
                  <Stack gap="lg" h="100%">
                    <Group justify="space-between">
                      <div>
                        <Text c="teal.2" size="sm" fw={700}>
                          {dictionary.home.workspace.eyebrow}
                        </Text>
                        <Title order={3} c="white">
                          {dictionary.home.workspace.title}
                        </Title>
                      </div>
                      <Badge color="teal" variant="filled">
                        {dictionary.home.workspace.status}
                      </Badge>
                    </Group>

                    <SimpleGrid cols={2} spacing="md">
                      <MetricCard
                        label={dictionary.home.workspace.healthScore}
                        value="84"
                        detail={dictionary.home.workspace.updated}
                      />
                      <MetricCard
                        label={dictionary.home.workspace.renewalsRisk}
                        value="07"
                        detail={dictionary.home.workspace.updated}
                      />
                    </SimpleGrid>

                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                      <Card radius={20} p="lg" bg="rgba(255,255,255,0.06)">
                        <Text size="sm" c="gray.2">
                          {dictionary.home.workspace.automatedCoverage}
                        </Text>
                        <Title order={2} c="white" mt="xs">
                          {dictionary.home.workspace.automatedCoverageValue}
                        </Title>
                        <Text c="gray.4" mt="sm">
                          {dictionary.home.workspace.automatedCoverageDetail}
                        </Text>
                      </Card>

                      <Card radius={20} p="lg" bg="rgba(255,255,255,0.06)">
                        <Text size="sm" c="gray.2">
                          {dictionary.home.workspace.expansionPulse}
                        </Text>
                        <Title order={2} c="white" mt="xs">
                          {dictionary.home.workspace.expansionPulseValue}
                        </Title>
                        <Text c="gray.4" mt="sm">
                          {dictionary.home.workspace.expansionPulseDetail}
                        </Text>
                      </Card>
                    </SimpleGrid>

                    <Card radius={20} p="lg" bg="rgba(255,255,255,0.06)" mt="auto">
                      <Text size="sm" c="gray.2">
                        {dictionary.home.workspace.executiveReadout}
                      </Text>
                      <Title order={3} c="white" mt="xs">
                        {dictionary.home.workspace.executiveTitle}
                      </Title>
                      <Stack gap="sm" mt="md">
                        {dictionary.home.workspace.highlights.map((item) => (
                          <Group key={item} wrap="nowrap" align="flex-start">
                            <ThemeIcon color="teal" size={22} radius="xl" mt={2}>
                              <IconChecklist size={14} />
                            </ThemeIcon>
                            <Text c="gray.1">{item}</Text>
                          </Group>
                        ))}
                      </Stack>
                    </Card>
                  </Stack>
                </Card>
                </div>
              </div>

              <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
                {featureCards.map(({ title, description, icon: Icon }) => (
                  <Card
                    key={title}
                    radius={22}
                    p="xl"
                    style={{
                      background: "var(--surface-strong)",
                      border: "1px solid var(--line)",
                    }}
                  >
                    <ThemeIcon size={48} radius="md" color="dark">
                      <Icon size={24} />
                    </ThemeIcon>
                    <Title order={3} mt="lg" mb="sm" fz={24}>
                      {title}
                    </Title>
                    <Text c="dimmed">{description}</Text>
                  </Card>
                ))}
              </SimpleGrid>

              <Card
                radius={24}
                p="xl"
                id="workflow"
                style={{
                  background: "var(--surface-strong)",
                  border: "1px solid var(--line)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "1.5rem",
                    alignItems: "flex-start",
                  }}
                >
                  <Stack gap="md" style={{ flex: "0.9 1 320px", minWidth: 0 }}>
                    <Badge variant="light" color="orange" radius="xl" w="fit-content">
                      {dictionary.home.workflow.badge}
                    </Badge>
                    <Title order={2}>{dictionary.home.workflow.title}</Title>
                    <Text c="dimmed">
                      {dictionary.home.workflow.description}
                    </Text>
                  </Stack>

                  <div style={{ flex: "1.35 1 620px", minWidth: 0 }}>
                    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                      {dictionary.home.workflow.steps.map((step) => (
                        <WorkflowStep
                          key={step.title}
                          title={step.title}
                          description={step.description}
                        />
                      ))}
                    </SimpleGrid>
                  </div>
                </div>
              </Card>
            </Stack>
          </Paper>
        </Container>
      </Box>
    </>
  );
}

type StatProps = {
  label: string;
  value: string;
  detail: string;
};

function Stat({ label, value, detail }: StatProps) {
  return (
    <Card
      radius={20}
      p="lg"
      style={{
        background: "var(--surface-strong)",
        border: "1px solid var(--line)",
      }}
    >
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text fw={800} fz={32} mt={8}>
        {value}
      </Text>
      <Text size="sm" c="dimmed" mt="xs">
        {detail}
      </Text>
    </Card>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
};

function MetricCard({ label, value, detail }: MetricCardProps) {
  return (
    <Card radius={18} p="md" bg="rgba(255,255,255,0.06)">
      <Text size="sm" c="gray.2">
        {label}
      </Text>
      <Text mt={18} fz={36} fw={800}>
        {value}
      </Text>
      <Text size="sm" c="teal.2">
        {detail}
      </Text>
    </Card>
  );
}

type WorkflowStepProps = {
  title: string;
  description: string;
};

function WorkflowStep({ title, description }: WorkflowStepProps) {
  return (
    <Card radius={18} p="lg" style={{ border: "1px solid var(--line)" }}>
      <Text fw={700}>{title}</Text>
      <Text c="dimmed" mt="xs">
        {description}
      </Text>
    </Card>
  );
}
