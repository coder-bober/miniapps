import type { AppModuleManifest } from "@/shared/modules/module-manifest";

export const moduleLabModule: AppModuleManifest = {
  id: "module-lab",
  label: "Module Lab",
  publicPath: "/module-lab",
  navItems: [
    {
      id: "module-lab-public",
      labels: {
        en: "Module Lab",
        ru: "Лаборатория модулей",
      },
      href: "/module-lab",
      area: "marketing",
    },
    {
      id: "module-lab",
      labels: {
        en: "Module Lab",
        ru: "Лаборатория модулей",
      },
      href: "/module-lab",
      area: "app",
    },
  ],
  jobs: [
    {
      id: "module-lab.echo",
      queue: "module-lab",
      description: "Queue a diagnostic module job through the shared worker pipeline.",
    },
  ],
  resolveAppSurface(dictionary) {
    return {
      eyebrow: dictionary.app.moduleLab.eyebrow,
      title: dictionary.app.moduleLab.title,
      description: dictionary.app.moduleLab.description,
      highlights: dictionary.app.moduleLab.highlights,
    };
  },
  resolvePublicSurface(dictionary) {
    return {
      eyebrow: dictionary.app.moduleLab.eyebrow,
      title: dictionary.app.moduleLab.title,
      description: dictionary.app.moduleLab.description,
      highlights: dictionary.app.moduleLab.highlights,
    };
  },
  resolveAppPageMetadata(dictionary) {
    return {
      title: dictionary.app.moduleLab.title,
      description: dictionary.app.moduleLab.description,
    };
  },
  resolvePublicPageMetadata(dictionary) {
    return {
      title: dictionary.app.moduleLab.title,
      description: dictionary.app.moduleLab.description,
    };
  },
};
