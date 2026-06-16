export * from "./module-lab.mjs";

import type { z } from "zod";

import {
  moduleLabErrorCodeSchema,
  moduleLabErrorResponseSchema,
  moduleLabRunJobRequestSchema,
  moduleLabRunJobResponseSchema,
  moduleLabStatusResponseSchema,
} from "./module-lab.mjs";

export type ModuleLabStatusResponse = z.infer<typeof moduleLabStatusResponseSchema>;
export type ModuleLabRunJobRequest = z.infer<typeof moduleLabRunJobRequestSchema>;
export type ModuleLabRunJobResponse = z.infer<typeof moduleLabRunJobResponseSchema>;
export type ModuleLabErrorCode = z.infer<typeof moduleLabErrorCodeSchema>;
export type ModuleLabErrorResponse = z.infer<typeof moduleLabErrorResponseSchema>;
