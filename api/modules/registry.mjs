import { filterEnabledModules, isModuleEnabled } from "../../src/shared/modules/enabled-modules.mjs";
import { moduleLabApiModule } from "./module-lab/manifest.mjs";
import { workspaceFilesApiModule } from "./workspace-files/manifest.mjs";

const registeredApiModules = [workspaceFilesApiModule, moduleLabApiModule];

export function getApiModuleById(moduleId) {
  if (!isModuleEnabled(moduleId)) {
    return null;
  }

  return getApiModules().find((module) => module.id === moduleId) ?? null;
}

export function getApiModuleJobs() {
  return getApiModules().flatMap((module) => module.jobs ?? []);
}

export function registerApiModuleRoutes(app) {
  for (const apiModule of getApiModules()) {
    if (typeof apiModule.registerRoutes === "function") {
      app.register(apiModule.registerRoutes);
    }
  }
}

export function getApiModules() {
  const enabledModules = filterEnabledModules(registeredApiModules);
  assertApiModuleRegistry(enabledModules);
  return enabledModules;
}

function assertApiModuleRegistry(modules) {
  const moduleIds = new Set();
  const jobIds = new Set();

  for (const apiModule of modules) {
    if (!apiModule.id || !apiModule.label) {
      throw new Error("Each API module must define non-empty id and label fields.");
    }

    if (moduleIds.has(apiModule.id)) {
      throw new Error(`Duplicate API module id detected: "${apiModule.id}".`);
    }

    moduleIds.add(apiModule.id);

    if (
      apiModule.registerRoutes !== undefined &&
      typeof apiModule.registerRoutes !== "function"
    ) {
      throw new Error(
        `API module "${apiModule.id}" must expose registerRoutes as a function when provided.`,
      );
    }

    const moduleJobIds = new Set((apiModule.jobs ?? []).map((job) => job.id));

    for (const job of apiModule.jobs ?? []) {
      if (!job.id || !job.queue) {
        throw new Error(
          `API module "${apiModule.id}" defines a job with a missing id or queue.`,
        );
      }

      if (jobIds.has(job.id)) {
        throw new Error(`Duplicate API module job id detected: "${job.id}".`);
      }

      jobIds.add(job.id);
    }

    for (const [jobId, handler] of Object.entries(apiModule.jobHandlers ?? {})) {
      if (!moduleJobIds.has(jobId)) {
        throw new Error(
          `API module "${apiModule.id}" defines a handler for unknown job "${jobId}".`,
        );
      }

      if (typeof handler !== "function") {
        throw new Error(
          `API module "${apiModule.id}" defines a non-function handler for job "${jobId}".`,
        );
      }
    }
  }
}
