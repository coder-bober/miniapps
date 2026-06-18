import assert from "node:assert/strict";

import { createQueueService } from "../core/queue/service.mjs";
import { runCase } from "./helpers/route-test-helpers.mjs";

await runCase("queue service exposes normalized module job runtime options", async () => {
  const queue = createQueueService();
  const registeredJob = queue.getRegisteredJob("workspace-files.generate-thumbnail");

  assert.ok(registeredJob);
  assert.equal(registeredJob.queue, "thumbnails");
  assert.equal(registeredJob.attempts, 3);
  assert.equal(registeredJob.backoffMs, 1000);
  assert.equal(registeredJob.removeOnComplete, 100);
  assert.equal(registeredJob.removeOnFail, false);

  const queuedJob = await queue.enqueueModuleJob("workspace-files.generate-thumbnail", {
    fileId: "file-1",
  });

  assert.equal(queuedJob.queue, "thumbnails");
  assert.equal(queuedJob.attempts, 3);
  assert.equal(queuedJob.backoffMs, 1000);
  assert.equal(queuedJob.removeOnComplete, 100);
  assert.equal(queuedJob.removeOnFail, false);
});
