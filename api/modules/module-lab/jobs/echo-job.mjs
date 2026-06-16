export async function runModuleLabEchoJob({ job, logger }) {
  logger.info(
    {
      jobId: job.id ?? null,
      jobName: job.name,
      payload: job.data,
    },
    "Processing module-lab echo job",
  );

  return {
    status: "completed",
    echoedMessage: job.data?.message ?? null,
    processedAt: new Date().toISOString(),
  };
}
