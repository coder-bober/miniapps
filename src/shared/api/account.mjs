import { z } from "zod";

export const accountAuthorizationErrorSchema = z.object({
  error: z.literal("authorization_required"),
  message: z.string(),
});

export const accountInvalidSessionErrorSchema = z.object({
  error: z.literal("invalid_session"),
  message: z.string(),
});

export const accountConfirmationMismatchErrorSchema = z.object({
  error: z.literal("confirmation_mismatch"),
  message: z.string(),
});

export const accountDeletionFailedErrorSchema = z.object({
  error: z.literal("account_deletion_failed"),
  message: z.string(),
});

export const accountGlobalSignOutFailedErrorSchema = z.object({
  error: z.literal("global_sign_out_failed"),
  message: z.string(),
});

export const accountDeleteRequestSchema = z.object({
  confirmation: z.string().trim().min(1),
});

export const accountSignOutEverywhereRequestSchema = z.object({});

export const accountSuccessResponseSchema = z.object({
  ok: z.literal(true),
});

export const accountDeleteErrorResponseSchema = z.union([
  accountAuthorizationErrorSchema,
  accountInvalidSessionErrorSchema,
  accountConfirmationMismatchErrorSchema,
  accountDeletionFailedErrorSchema,
]);

export const accountSignOutEverywhereErrorResponseSchema = z.union([
  accountAuthorizationErrorSchema,
  accountInvalidSessionErrorSchema,
  accountGlobalSignOutFailedErrorSchema,
]);

export const accountDeleteResponseSchema = z.union([
  accountSuccessResponseSchema,
  accountDeleteErrorResponseSchema,
]);

export const accountSignOutEverywhereResponseSchema = z.union([
  accountSuccessResponseSchema,
  accountSignOutEverywhereErrorResponseSchema,
]);

export const accountDeleteErrorCodeSchema = z.enum([
  "authorization_required",
  "invalid_session",
  "confirmation_mismatch",
  "account_deletion_failed",
  "internal_api_error",
]);

export const accountSignOutEverywhereErrorCodeSchema = z.enum([
  "authorization_required",
  "invalid_session",
  "global_sign_out_failed",
  "internal_api_error",
]);
