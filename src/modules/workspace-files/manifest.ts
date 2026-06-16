import type { AppModuleManifest } from "@/shared/modules/module-manifest";

export const workspaceFilesModule: AppModuleManifest = {
  id: "workspace-files",
  label: "Workspace Files",
  navItems: [
    {
      id: "workspace-files",
      labels: {
        en: "Workspace",
        ru: "Рабочее пространство",
      },
      href: "/workspace",
      area: "app",
    },
  ],
  jobs: [
    {
      id: "workspace-files.generate-thumbnail",
      queue: "thumbnails",
      description: "Generate thumbnails and preview images for uploaded workspace files.",
    },
  ],
  resolveAppSurface(dictionary) {
    return {
      eyebrow: dictionary.app.workspace.eyebrow,
      title: dictionary.app.workspace.title,
      description: dictionary.app.workspace.description,
      highlights: dictionary.app.workspace.highlights,
    };
  },
  resolveAppPageMetadata(dictionary) {
    return {
      title: dictionary.app.workspace.title,
      description: dictionary.app.workspace.description,
    };
  },
};
