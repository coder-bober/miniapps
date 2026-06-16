import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

import { getApiConfig } from "../../config.mjs";
import {
  getRegisteredModuleJobHandler,
  getRegisteredModuleJobs,
} from "../../modules/jobs.mjs";

export function hasBullMQConfig(config = getApiConfig()) {
  return Boolean(config.redisUrl);
}

function createRedisConnection(config = getApiConfig()) {
  if (!config.redisUrl) {
    throw new Error("Missing REDIS_URL for BullMQ queue integration.");
  }

  return new IORedis(config.redisUrl, {
    maxRetriesPerRequest: config.redisMaxRetriesPerRequest,
  });
}

function serializeError(error) {
  if (!error) {
    return null;
  }

  return {
    name: error.name ?? "Error",
    message: error.message ?? String(error),
    stack: error.stack ?? null,
  };
}

export function createBullMQQueueTransport(config = getApiConfig()) {
  const connection = createRedisConnection(config);
  const queues = new Map();

  function getQueue(queueName) {
    if (!queues.has(queueName)) {
      queues.set(
        queueName,
        new Queue(queueName, {
          connection,
        }),
      );
    }

    return queues.get(queueName);
  }

  return {
    async enqueue(queuedJob) {
      const queue = getQueue(queuedJob.queue);
      const bullJob = await queue.add(queuedJob.jobId, queuedJob.payload, {
        attempts: queuedJob.attempts,
        backoff:
          queuedJob.backoffMs > 0
            ? {
                type: "exponential",
                delay: queuedJob.backoffMs,
              }
            : undefined,
        removeOnComplete: queuedJob.removeOnComplete,
        removeOnFail: queuedJob.removeOnFail,
      });

      return {
        ...queuedJob,
        provider: "bullmq",
        providerJobId: bullJob.id?.toString() ?? null,
      };
    },
    async close() {
      await Promise.all([...queues.values()].map((queue) => queue.close()));
      await connection.quit();
    },
  };
}

export function createBullMQWorkerRuntime({
  config = getApiConfig(),
  services = {},
  logger = console,
} = {}) {
  const connection = createRedisConnection(config);
  const registeredJobs = getRegisteredModuleJobs();
  const workerQueueNames = [...new Set(registeredJobs.map((job) => job.queue))];

  const workers = workerQueueNames.map(
    (queueName) =>
      new Worker(
        queueName,
        async (job) => {
          const handler = getRegisteredModuleJobHandler(job.name);

          if (!handler) {
            throw new Error(`No registered BullMQ handler found for job "${job.name}".`);
          }

          return handler({
            job,
            services,
            logger,
          });
        },
        {
          connection,
        },
      ),
  );

  for (const worker of workers) {
    worker.on("active", (job) => {
      logger.info(
        {
          queue: worker.name,
          jobId: job.id ?? null,
          jobName: job.name,
          attemptsMade: job.attemptsMade,
          attemptsStarted: job.attemptsStarted,
        },
        "BullMQ job started",
      );
    });

    worker.on("completed", (job) => {
      logger.info(
        {
          queue: worker.name,
          jobId: job.id ?? null,
          jobName: job.name,
          attemptsMade: job.attemptsMade,
        },
        "BullMQ job completed",
      );
    });

    worker.on("failed", (job, error) => {
      logger.error(
        {
          queue: worker.name,
          jobId: job?.id ?? null,
          jobName: job?.name ?? null,
          attemptsMade: job?.attemptsMade ?? null,
          maxAttempts: job?.opts?.attempts ?? null,
          error: serializeError(error),
        },
        "BullMQ job failed",
      );
    });

    worker.on("stalled", (jobId) => {
      logger.error(
        {
          queue: worker.name,
          jobId,
        },
        "BullMQ job stalled",
      );
    });
  }

  return {
    workers,
    getRegisteredJobs() {
      return registeredJobs;
    },
    async close() {
      await Promise.all(workers.map((worker) => worker.close()));
      await connection.quit();
    },
  };
}
