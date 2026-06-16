import { z } from "zod";

export const moduleLabCapabilitySchema = z.enum([
  "module-lab.read",
  "module-lab.run_job",
]);

export const moduleLabJobSchema = z.object({
  id: z.string(),
  queue: z.string(),
  description: z.string().optional(),
});

export const moduleLabStatusResponseSchema = z.object({
  module: z.object({
    id: z.literal("module-lab"),
    label: z.string(),
  }),
  role: z.enum(["viewer", "operator"]).nullable(),
  capabilities: z.array(moduleLabCapabilitySchema),
  jobs: z.array(moduleLabJobSchema),
});

export const moduleLabRunJobRequestSchema = z.object({
  message: z.string().trim().min(1).max(120).default("Module lab ping"),
});

export const moduleLabRunJobResponseSchema = z.object({
  ok: z.literal(true),
  jobId: z.string(),
  queue: z.string(),
  queuedAt: z.string(),
  provider: z.string().nullable().optional(),
  providerJobId: z.string().nullable().optional(),
  message: z.string(),
});

export const moduleLabErrorCodeSchema = z.enum([
  "authorization_required",
  "invalid_session",
  "module_disabled",
  "module_capability_required",
  "module_lab_failed",
]);

export const moduleLabErrorResponseSchema = z.object({
  error: moduleLabErrorCodeSchema,
  message: z.string(),
  requiredCapability: moduleLabCapabilitySchema.optional(),
});
