import { Alert, Stack, Text } from "@mantine/core";

import { getCurrentUserModuleAccess } from "@/core/authz/module-access";
import { ModulePublicPageShell } from "@/core/modules/module-public-page-shell";
import { resolvePublicWorkspaceSelection } from "@/core/workspaces/public-workspace";
import { getCurrentUserWorkspaceModuleAccess } from "@/core/authz/module-access";
import { ModuleLabCard } from "@/modules/module-lab/components/module-lab-card";
import type { Locale } from "@/lib/i18n/config";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";
import type { AuthenticatedUser } from "@/types/auth";

type ModuleLabPageProps = {
  locale: Locale;
  dictionary: SiteDictionary;
  user: AuthenticatedUser | null;
  searchParams: Record<string, string | string[] | undefined>;
};

export async function ModuleLabPage({ locale, dictionary, user, searchParams }: ModuleLabPageProps) {
  const publicWorkspaceSelection = await resolvePublicWorkspaceSelection({
    searchParams,
    fallbackNotice: dictionary.app.moduleLab.publicWorkspaceFallbackNotice,
  });

  if (!user) {
    return (
      <ModulePublicPageShell moduleId="module-lab" locale={locale} dictionary={dictionary} user={user}>
        {publicWorkspaceSelection.workspace ? (
          <Alert color="blue" radius="lg" title={dictionary.app.shared.workspaceLabel}>
            <Text c="dimmed">
              {dictionary.app.moduleLab.publicWorkspaceNotice.replace(
                "{workspace}",
                publicWorkspaceSelection.workspace.name,
              )}
            </Text>
          </Alert>
        ) : null}
        {publicWorkspaceSelection.fallbackNotice ? (
          <Alert color="yellow" radius="lg" title={dictionary.app.shared.workspaceLabel}>
            <Text c="dimmed">{publicWorkspaceSelection.fallbackNotice}</Text>
          </Alert>
        ) : null}
        <Alert color="teal" radius="lg" title={dictionary.app.moduleLab.cardTitle}>
          <Stack gap={4}>
            <Text c="dimmed">{dictionary.app.moduleLab.cardDescription}</Text>
            <Text c="dimmed">{dictionary.app.moduleLab.publicGuestNotice}</Text>
          </Stack>
        </Alert>
      </ModulePublicPageShell>
    );
  }

  return (
    <ResolvedModuleLabPage
      locale={locale}
      dictionary={dictionary}
      user={user}
      publicWorkspaceSelection={publicWorkspaceSelection}
    />
  );
}

async function ResolvedModuleLabPage({
  locale,
  dictionary,
  user,
  publicWorkspaceSelection,
}: {
  locale: Locale;
  dictionary: SiteDictionary;
  user: AuthenticatedUser;
  publicWorkspaceSelection: Awaited<ReturnType<typeof resolvePublicWorkspaceSelection>>;
}) {
  const moduleAccess = publicWorkspaceSelection.workspace
    ? await getCurrentUserWorkspaceModuleAccess(
        user.id,
        publicWorkspaceSelection.workspace.id,
        "module-lab",
      )
    : await getCurrentUserModuleAccess(user.id, "module-lab");
  const canRead = moduleAccess.capabilities.includes("module-lab.read");
  const canRunJob = moduleAccess.capabilities.includes("module-lab.run_job");

  return (
    <ModulePublicPageShell moduleId="module-lab" locale={locale} dictionary={dictionary} user={user}>
      {publicWorkspaceSelection.workspace ? (
        <Alert color="blue" radius="lg" title={dictionary.app.shared.workspaceLabel}>
          <Text c="dimmed">
            {dictionary.app.moduleLab.publicWorkspaceNotice.replace(
              "{workspace}",
              publicWorkspaceSelection.workspace.name,
            )}
          </Text>
        </Alert>
      ) : null}
      {publicWorkspaceSelection.fallbackNotice ? (
        <Alert color="yellow" radius="lg" title={dictionary.app.shared.workspaceLabel}>
          <Text c="dimmed">{publicWorkspaceSelection.fallbackNotice}</Text>
        </Alert>
      ) : null}
      {canRead ? (
        <ModuleLabCard
          dictionary={dictionary.app.moduleLab}
          canRunJob={canRunJob}
          workspaceId={publicWorkspaceSelection.workspace?.id ?? null}
          workspaceName={publicWorkspaceSelection.workspace?.name ?? null}
        />
      ) : (
        <Alert color="yellow" radius="lg" title={dictionary.app.moduleLab.cardTitle}>
          <Stack gap={4}>
            <Text c="dimmed">{dictionary.app.moduleLab.cardDescription}</Text>
            <Text c="dimmed">{dictionary.app.moduleLab.accessDeniedNotice}</Text>
          </Stack>
        </Alert>
      )}
    </ModulePublicPageShell>
  );
}
