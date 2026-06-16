import type { Metadata } from "next";

import {
  generateAuthenticatedAppPageMetadata,
  renderAuthenticatedAppPage,
} from "@/core/routes/authenticated-app-route";
import { CoreAppPageShell } from "@/core/pages/core-app-page-shell";
import { isModuleEnabled } from "@/shared/modules/enabled-modules";
import { WorkspaceFilesCard } from "@/modules/workspace-files/components/workspace-files-card";
import { WorkspaceMembersCard } from "@/modules/workspaces/components/workspace-members-card";
import { WorkspaceModuleLabAccessCard } from "@/modules/workspaces/components/workspace-module-lab-access-card";

type PageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return generateAuthenticatedAppPageMetadata({
    params,
    canonicalPath: (locale) => `/${locale}/workspace`,
    resolveMetadata(dictionary) {
      return {
        title: dictionary.app.workspace.title,
        description: dictionary.app.workspace.description,
      };
    },
  });
}

export default async function WorkspacePage({ params }: PageProps) {
  const workspaceFilesEnabled = isModuleEnabled("workspace-files");

  return renderAuthenticatedAppPage({
    params,
    signInPath: (locale) => `/${locale}/sign-in`,
    render: ({ locale, dictionary, user }) => (
      <CoreAppPageShell
        locale={locale}
        dictionary={dictionary}
        user={user}
        surface={{
          eyebrow: dictionary.app.workspace.eyebrow,
          title: dictionary.app.workspace.title,
          description: dictionary.app.workspace.description,
          highlights: dictionary.app.workspace.highlights,
        }}
      >
        <WorkspaceMembersCard
          dictionary={dictionary.app.workspace}
          sharedDictionary={dictionary.app.shared}
        />
        {isModuleEnabled("module-lab") ? (
          <WorkspaceModuleLabAccessCard dictionary={dictionary.app.workspace} />
        ) : null}
        {workspaceFilesEnabled ? (
          <WorkspaceFilesCard dictionary={dictionary.app.workspace} />
        ) : null}
      </CoreAppPageShell>
    ),
  });
}
