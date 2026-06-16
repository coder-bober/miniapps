import { getRegisteredModuleJob, getRegisteredModuleJobs } from "../../modules/jobs.mjs";

export function createQueueService({ transport } = {}) {
  return {
    getRegisteredJobs() {
      return getRegisteredModuleJobs();
    },
    getRegisteredJob(jobId) {
      return getRegisteredModuleJob(jobId);
    },
    async enqueueModuleJob(jobId, payload) {
      const job = getRegisteredModuleJob(jobId);

      if (!job) {
        throw new Error(`Cannot enqueue unregistered module job "${jobId}".`);
      }

      const queuedJob = {
        jobId: job.id,
        queue: job.queue,
        moduleId: job.moduleId,
        moduleLabel: job.moduleLabel,
        attempts: job.attempts,
        backoffMs: job.backoffMs,
        removeOnComplete: job.removeOnComplete,
        removeOnFail: job.removeOnFail,
        payload,
        queuedAt: new Date().toISOString(),
      };

      if (transport?.enqueue) {
        return transport.enqueue(queuedJob);
      }

      return queuedJob;
    },
    async closeQueue() {
      if (transport?.close) {
        await transport.close();
      }
    },
  };
}
