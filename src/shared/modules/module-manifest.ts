import type { Locale } from "@/lib/i18n/config";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";

export type ModuleNavItem = {
  id: string;
  labels: Record<Locale, string>;
  href: string;
  area: "app" | "marketing";
};

export type ModuleAppSurface = {
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
};

export type ModulePublicSurface = {
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
};

export type ModulePageMetadata = {
  title: string;
  description: string;
};

export type ModuleJobDef = {
  id: string;
  queue: string;
  description?: string;
};

export type AppModuleManifest = {
  id: string;
  label: string;
  navItems?: ModuleNavItem[];
  jobs?: ModuleJobDef[];
  publicPath?: string;
  resolveAppSurface?: (dictionary: SiteDictionary) => ModuleAppSurface;
  resolvePublicSurface?: (dictionary: SiteDictionary) => ModulePublicSurface;
  resolveAppPageMetadata?: (dictionary: SiteDictionary) => ModulePageMetadata;
  resolvePublicPageMetadata?: (dictionary: SiteDictionary) => ModulePageMetadata;
};
