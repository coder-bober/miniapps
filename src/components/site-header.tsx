"use client";

import {
  ActionIcon,
  Avatar,
  Anchor,
  Box,
  Button,
  Burger,
  Drawer,
  Group,
  Menu,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure, useMounted } from "@mantine/hooks";
import { useComputedColorScheme, useMantineColorScheme } from "@mantine/core";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import {
  IconBolt,
  IconLanguage,
  IconLogout,
  IconMoonStars,
  IconSettings,
  IconSparkles,
  IconSunHigh,
  IconUserCircle,
} from "@tabler/icons-react";

import { localeLabels, locales, type Locale } from "@/lib/i18n/config";
import { getLocalePath } from "@/lib/i18n/navigation";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";
import type { LocalizedModuleNavItem } from "@/modules/navigation";
import type { AuthenticatedUser } from "@/types/auth";

type SiteHeaderProps = {
  dictionary: SiteDictionary["header"];
  locale: Locale;
  user: AuthenticatedUser | null;
  marketingModuleLinks?: LocalizedModuleNavItem[];
  appModuleLinks?: LocalizedModuleNavItem[];
};

export function SiteHeader({
  dictionary,
  locale,
  user,
  marketingModuleLinks = [],
  appModuleLinks = [],
}: SiteHeaderProps) {
  const { setColorScheme } = useMantineColorScheme();
  const [navOpened, navHandlers] = useDisclosure(false);
  const [profileOpened, profileHandlers] = useDisclosure(false);
  const mounted = useMounted();
  const pathname = usePathname();
  const computedColorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });

  const isDark = mounted ? computedColorScheme === "dark" : false;
  const navLinks = [
    { href: `/${locale}#product`, label: dictionary.nav.product },
    { href: `/${locale}#metrics`, label: dictionary.nav.metrics },
    { href: `/${locale}#workflow`, label: dictionary.nav.workflow },
    ...marketingModuleLinks.map((item) => ({
      href: item.href,
      label: item.label,
    })),
  ];
  const appNavLinks = appModuleLinks;
  const localizedPathname = pathname ?? `/${locale}`;
  const profilePath = `/${locale}/profile`;
  const settingsPath = `/${locale}/settings`;
  const signInPath = `/${locale}/sign-in`;
  const signUpPath = `/${locale}/sign-up`;
  const logoutPath = "/auth/sign-out";
  const userDisplayName = user?.displayName ?? dictionary.user.name;

  return (
    <>
      <Paper
        radius={22}
        p="md"
        style={{
          position: "sticky",
          top: 16,
          zIndex: 20,
          background: "var(--surface)",
          backdropFilter: "blur(18px)",
          border: "1px solid var(--line)",
          boxShadow: "0 12px 40px rgba(17, 33, 45, 0.08)",
        }}
      >
        <Group justify="space-between" visibleFrom="lg" wrap="nowrap">
          <Group gap="xl" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
            <Group gap="xs">
              <ThemeIcon size={42} radius="md" color="teal">
                <IconSparkles size={22} />
              </ThemeIcon>
              <Link href={`/${locale}`} style={{ display: "block" }}>
                <Text fw={800} ff="var(--font-space-grotesk), sans-serif">
                  QuietShift
                </Text>
                <Text size="sm" c="dimmed">
                  {dictionary.brandTagline}
                </Text>
              </Link>
            </Group>

            <Group gap="lg" wrap="nowrap" style={{ minWidth: 0 }}>
              {navLinks.map(({ href, label }) => (
                <Link key={label} href={href} style={desktopNavLinkStyle}>
                  <Text c="dimmed">{label}</Text>
                </Link>
              ))}
            </Group>
          </Group>

          <Group gap="sm" wrap="nowrap">
            <Menu shadow="md" width={180} position="bottom-end" withArrow>
              <Menu.Target>
                <ActionIcon
                  variant="default"
                  size={42}
                  radius="xl"
                  aria-label={dictionary.languageLabel}
                >
                  <IconLanguage size={18} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>{dictionary.languageLabel}</Menu.Label>
                {locales.map((item) => (
                  <Menu.Item
                    key={item}
                    component={Link}
                    href={getLocalePath(item, localizedPathname)}
                    fw={item === locale ? 700 : 500}
                  >
                    {localeLabels[item]}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>

            <ActionIcon
              variant="default"
              size={42}
              radius="xl"
              aria-label={isDark ? dictionary.theme.light : dictionary.theme.dark}
              onClick={() => setColorScheme(isDark ? "light" : "dark")}
            >
              {isDark ? <IconSunHigh size={18} /> : <IconMoonStars size={18} />}
            </ActionIcon>

            {user ? (
              <Menu shadow="md" width={220} position="bottom-end" withArrow>
                <Menu.Target>
                  <UnstyledButton
                    aria-label="Open user menu"
                    style={avatarTriggerStyle}
                  >
                    <Avatar
                      size={28}
                      radius="xl"
                      color="teal"
                      name={userDisplayName}
                      src={user.avatarUrl ?? undefined}
                    />
                  </UnstyledButton>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Label>{userDisplayName}</Menu.Label>
                  <Menu.Item
                    leftSection={<IconUserCircle size={16} />}
                    component={Link}
                    href={profilePath}
                  >
                    {dictionary.user.profile}
                  </Menu.Item>
                  {appNavLinks.map((item) => (
                    <Menu.Item
                      key={item.id}
                      leftSection={<IconBolt size={16} />}
                      component={Link}
                      href={item.href}
                    >
                      {item.label}
                    </Menu.Item>
                  ))}
                  <Menu.Item
                    leftSection={<IconSettings size={16} />}
                    component={Link}
                    href={settingsPath}
                  >
                    {dictionary.user.settings}
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item
                    leftSection={<IconLogout size={16} />}
                    c="red"
                    component={Link}
                    href={logoutPath}
                    prefetch={false}
                  >
                    {dictionary.user.signOut}
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            ) : (
              <Group gap="sm" wrap="nowrap">
                <Button component={Link} href={signInPath} variant="default" radius="xl">
                  {dictionary.auth.signInLink}
                </Button>
                <Button
                  component={Link}
                  href={signUpPath}
                  variant="filled"
                  color="dark"
                  radius="xl"
                  leftSection={<IconUserCircle size={16} />}
                >
                  {dictionary.auth.signUpLink}
                </Button>
              </Group>
            )}
          </Group>
        </Group>

        <Box
          hiddenFrom="lg"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <Group justify="flex-start">
            <Burger
              opened={navOpened}
              onClick={navHandlers.toggle}
              size="sm"
              aria-label="Open navigation"
            />
          </Group>

          <UnstyledButton
            component={Link}
            href={`/${locale}`}
            style={{ justifySelf: "center", display: "inline-flex" }}
            aria-label="QuietShift home"
          >
            <ThemeIcon size={42} radius="md" color="teal">
              <IconSparkles size={22} />
            </ThemeIcon>
          </UnstyledButton>

          <Group justify="flex-end" gap="sm" wrap="nowrap">
            <Menu shadow="md" width={180} position="bottom-end" withArrow>
              <Menu.Target>
                <ActionIcon
                  variant="default"
                  size={42}
                  radius="xl"
                  aria-label={dictionary.languageLabel}
                >
                  <IconLanguage size={18} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>{dictionary.languageLabel}</Menu.Label>
                {locales.map((item) => (
                  <Menu.Item
                    key={item}
                    component={Link}
                    href={getLocalePath(item, localizedPathname)}
                    fw={item === locale ? 700 : 500}
                  >
                    {localeLabels[item]}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>

            <ActionIcon
              variant="default"
              size={42}
              radius="xl"
              aria-label={isDark ? dictionary.theme.light : dictionary.theme.dark}
              onClick={() => setColorScheme(isDark ? "light" : "dark")}
            >
              {isDark ? <IconSunHigh size={18} /> : <IconMoonStars size={18} />}
            </ActionIcon>
            {user ? (
              <UnstyledButton
                aria-label="Open user panel"
                onClick={profileHandlers.open}
                style={avatarTriggerStyle}
              >
                <Avatar
                  size={28}
                  radius="xl"
                  color="teal"
                  name={userDisplayName}
                  src={user.avatarUrl ?? undefined}
                />
              </UnstyledButton>
            ) : (
              <ActionIcon
                component={Link}
                href={signInPath}
                variant="filled"
                color="dark"
                size={42}
                radius="xl"
                aria-label={dictionary.auth.signInLink}
              >
                <IconUserCircle size={18} />
              </ActionIcon>
            )}
          </Group>
        </Box>
      </Paper>

      <Drawer
        opened={navOpened}
        onClose={navHandlers.close}
        title={dictionary.user.navigationTitle}
        position="left"
        size="xs"
        padding="lg"
      >
        <Stack gap="md">
          {navLinks.map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              style={drawerNavLinkStyle}
              onClick={navHandlers.close}
            >
              <Text size="lg">{label}</Text>
            </Link>
          ))}
        </Stack>
      </Drawer>

      {user ? (
        <Drawer
          opened={profileOpened}
          onClose={profileHandlers.close}
          title={userDisplayName}
          position="right"
          size="xs"
          padding="lg"
        >
          <Stack gap="sm">
            <Anchor component={Link} href={profilePath} c="inherit" onClick={profileHandlers.close}>
              {dictionary.user.profile}
            </Anchor>
            {appNavLinks.map((item) => (
              <Anchor
                key={item.id}
                component={Link}
                href={item.href}
                c="inherit"
                onClick={profileHandlers.close}
              >
                {item.label}
              </Anchor>
            ))}
            <Anchor component={Link} href={settingsPath} c="inherit" onClick={profileHandlers.close}>
              {dictionary.user.settings}
            </Anchor>
            <Anchor
              component={Link}
              href={logoutPath}
              prefetch={false}
              c="red"
              onClick={profileHandlers.close}
            >
              {dictionary.user.signOut}
            </Anchor>
          </Stack>
        </Drawer>
      ) : null}
    </>
  );
}

const avatarTriggerStyle: CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 999,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid var(--line)",
  background: "var(--surface-strong)",
};

const desktopNavLinkStyle: CSSProperties = {
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
};

const drawerNavLinkStyle: CSSProperties = {
  color: "inherit",
  textDecoration: "none",
};
