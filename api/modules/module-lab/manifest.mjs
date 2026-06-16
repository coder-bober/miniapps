import { defineApiModule } from "../../core/modules/manifest.mjs";
import { runModuleLabEchoJob } from "./jobs/echo-job.mjs";
import { registerModuleLabRoutes } from "./routes/module-lab.mjs";

export const moduleLabApiModule = defineApiModule({
  id: "module-lab",
  label: "Module Lab",
  registerRoutes: registerModuleLabRoutes,
  jobs: [
    {
      id: "module-lab.echo",
      queue: "module-lab",
      description: "Queue a diagnostic echo job for the test module.",
      attempts: 1,
      backoffMs: 0,
      removeOnComplete: 20,
      removeOnFail: false,
    },
  ],
  jobHandlers: {
    "module-lab.echo": runModuleLabEchoJob,
  },
});
