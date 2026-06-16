export * from "./account.mjs";

import type { z } from "zod";

import {
  accountDeleteErrorCodeSchema,
  accountDeleteResponseSchema,
  accountDeleteRequestSchema,
  accountSignOutEverywhereErrorCodeSchema,
  accountSignOutEverywhereRequestSchema,
  accountSignOutEverywhereResponseSchema,
} from "./account.mjs";

export type AccountDeleteRequest = z.infer<typeof accountDeleteRequestSchema>;
export type AccountDeleteResponse = z.infer<typeof accountDeleteResponseSchema>;
export type AccountDeleteErrorCode = z.infer<typeof accountDeleteErrorCodeSchema>;
export type AccountSignOutEverywhereRequest = z.infer<
  typeof accountSignOutEverywhereRequestSchema
>;
export type AccountSignOutEverywhereResponse = z.infer<
  typeof accountSignOutEverywhereResponseSchema
>;
export type AccountSignOutEverywhereErrorCode = z.infer<
  typeof accountSignOutEverywhereErrorCodeSchema
>;
