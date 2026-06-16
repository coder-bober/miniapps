import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { getAppModulePageMetadata } from "@/modules/registry";
import { isModuleEnabled } from "@/shared/modules/enabled-modules";
import {
  generateAuthenticatedAppPageMetadata,
  renderAuthenticatedAppPage,
  type AuthenticatedAppRouteContext,
} from "@/core/routes/authenticated-app-route";
import type { Locale } from "@/lib/i18n/config";

type RenderAuthenticatedModulePageOptions = {
  params: Promise<{
    locale: string;
  }>;
  moduleId: string;
  signInPath: (locale: Locale) => string;
  render: (
    context: AuthenticatedAppRouteContext,
  ) => ReactNode | Promise<ReactNode>;
};

type GenerateModulePageMetadataOptions = {
  params: Promise<{
    locale: string;
  }>;
  moduleId: string;
  canonicalPath: (locale: Locale) => string;
};

export async function generateAuthenticatedModulePageMetadata({
  params,
  moduleId,
  canonicalPath,
}: GenerateModulePageMetadataOptions): Promise<Metadata> {
  if (!isModuleEnabled(moduleId)) {
    return {};
  }

  return generateAuthenticatedAppPageMetadata({
    params,
    canonicalPath,
    resolveMetadata(dictionary) {
      const pageMetadata = getAppModulePageMetadata(moduleId, dictionary);

      if (!pageMetadata) {
        return {};
      }

      return pageMetadata;
    },
  });
}

export async function renderAuthenticatedModulePage({
  params,
  moduleId,
  signInPath,
  render,
}: RenderAuthenticatedModulePageOptions) {
  if (!isModuleEnabled(moduleId)) {
    notFound();
  }

  return renderAuthenticatedAppPage({
    params,
    signInPath,
    render,
  });
}
