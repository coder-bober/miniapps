import { defineApiModule } from "../../core/modules/manifest.mjs";
import { generateWorkspaceFileThumbnail } from "./jobs/generate-thumbnail.mjs";
import { registerWorkspaceFileRoutes } from "./routes/files.mjs";

export const workspaceFilesApiModule = defineApiModule({
  id: "workspace-files",
  label: "Workspace Files",
  registerRoutes: registerWorkspaceFileRoutes,
  jobs: [
    {
      id: "workspace-files.generate-thumbnail",
      queue: "thumbnails",
      description: "Generate thumbnails and preview images for uploaded workspace files.",
      attempts: 3,
      backoffMs: 1000,
      removeOnComplete: 100,
      removeOnFail: false,
    },
  ],
  jobHandlers: {
    "workspace-files.generate-thumbnail": generateWorkspaceFileThumbnail,
  },
});
