import type { Metadata } from "next";

import {
  generatePublicModulePageMetadata,
  renderPublicModulePage,
} from "@/core/routes/module-public-route";
import { ModuleLabPage } from "@/modules/module-lab/pages/module-lab-page";

type PageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return generatePublicModulePageMetadata({
    params,
    moduleId: "module-lab",
    canonicalPath: (locale) => `/${locale}/module-lab`,
  });
}

export default async function ModuleLabRoute({ params, searchParams }: PageProps) {
  return renderPublicModulePage({
    params,
    searchParams,
    moduleId: "module-lab",
    render: ({ locale, dictionary, user, searchParams: resolvedSearchParams }) => (
      <ModuleLabPage
        locale={locale}
        dictionary={dictionary}
        user={user}
        searchParams={resolvedSearchParams}
      />
    ),
  });
}
