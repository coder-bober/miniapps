import { getApiModules } from "./registry.mjs";

function normalizeRegisteredModuleJob(apiModule, job) {
  return {
    ...job,
    moduleId: apiModule.id,
    moduleLabel: apiModule.label,
    attempts: job.attempts ?? 1,
    backoffMs: job.backoffMs ?? 0,
    removeOnComplete: job.removeOnComplete ?? 100,
    removeOnFail: job.removeOnFail ?? false,
  };
}

export function getRegisteredModuleJobs() {
  return getApiModules().flatMap((apiModule) =>
    (apiModule.jobs ?? []).map((job) => normalizeRegisteredModuleJob(apiModule, job)),
  );
}

export function getRegisteredModuleJob(jobId) {
  return getRegisteredModuleJobs().find((job) => job.id === jobId) ?? null;
}

export function getRegisteredModuleJobsByQueue(queueName) {
  return getRegisteredModuleJobs().filter((job) => job.queue === queueName);
}

export function getRegisteredModuleJobHandler(jobId) {
  for (const apiModule of getApiModules()) {
    const handler = apiModule.jobHandlers?.[jobId];

    if (handler) {
      return handler;
    }
  }

  return null;
}
