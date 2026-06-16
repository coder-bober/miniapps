import { ModuleAppPageShell } from "@/core/modules/module-app-page-shell";
import { WorkspaceFilesCard } from "@/modules/workspace-files/components/workspace-files-card";
import type { Locale } from "@/lib/i18n/config";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";
import type { AuthenticatedUser } from "@/types/auth";

type WorkspaceFilesPageProps = {
  locale: Locale;
  dictionary: SiteDictionary;
  user: AuthenticatedUser;
};

export function WorkspaceFilesPage({
  locale,
  dictionary,
  user,
}: WorkspaceFilesPageProps) {
  return (
    <ModuleAppPageShell
      moduleId="workspace-files"
      locale={locale}
      dictionary={dictionary}
      user={user}
    >
      <WorkspaceFilesCard dictionary={dictionary.app.workspace} />
    </ModuleAppPageShell>
  );
}
