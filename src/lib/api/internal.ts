import {
  accountDeleteErrorCodeSchema,
  accountDeleteRequestSchema,
  accountDeleteResponseSchema,
  accountSignOutEverywhereErrorCodeSchema,
  accountSignOutEverywhereRequestSchema,
  accountSignOutEverywhereResponseSchema,
} from "@/shared/api/account.mjs";
import type {
  AccountDeleteErrorCode,
  AccountSignOutEverywhereErrorCode,
} from "@/shared/api/account";

function getFallbackInternalApiUrl() {
  const apiPort = process.env.API_PORT ?? "8787";
  return `http://127.0.0.1:${apiPort}`;
}

export function getInternalApiUrl() {
  return process.env.INTERNAL_API_URL ?? getFallbackInternalApiUrl();
}

type InternalApiDeleteAccountResult =
  | { ok: true }
  | {
      ok: false;
      error: AccountDeleteErrorCode;
      message: string;
      status: number;
    };

type InternalApiResult =
  | { ok: true }
  | {
      ok: false;
      error: AccountSignOutEverywhereErrorCode;
      message: string;
      status: number;
    };

export async function deleteOwnAccountViaApi({
  accessToken,
  confirmation,
}: {
  accessToken: string;
  confirmation: string;
}): Promise<InternalApiDeleteAccountResult> {
  return postInternalApi(
    "/v1/account/delete",
    accessToken,
    accountDeleteRequestSchema.parse({ confirmation }),
    accountDeleteResponseSchema,
    accountDeleteErrorCodeSchema,
  );
}

export async function signOutEverywhereViaApi({
  accessToken,
}: {
  accessToken: string;
}): Promise<InternalApiResult> {
  return postInternalApi(
    "/v1/account/sign-out-everywhere",
    accessToken,
    accountSignOutEverywhereRequestSchema.parse({}),
    accountSignOutEverywhereResponseSchema,
    accountSignOutEverywhereErrorCodeSchema,
  );
}

async function postInternalApi(
  path: string,
  accessToken: string,
  payload: object,
  responseSchema: {
    safeParse(input: unknown):
      | {
          success: true;
          data: { ok: true } | { error: string; message: string };
        }
      | { success: false };
  },
  errorCodeSchema: {
    parse(input: unknown): AccountDeleteErrorCode;
  },
): Promise<InternalApiDeleteAccountResult>;
async function postInternalApi(
  path: string,
  accessToken: string,
  payload: object,
  responseSchema: {
    safeParse(input: unknown):
      | {
          success: true;
          data: { ok: true } | { error: string; message: string };
        }
      | { success: false };
  },
  errorCodeSchema: {
    parse(input: unknown): AccountSignOutEverywhereErrorCode;
  },
): Promise<InternalApiResult>;
async function postInternalApi(
  path: string,
  accessToken: string,
  payload: object,
  responseSchema: {
    safeParse(input: unknown):
      | {
          success: true;
          data: { ok: true } | { error: string; message: string };
        }
      | { success: false };
  },
  errorCodeSchema: {
    parse(input: unknown): AccountDeleteErrorCode | AccountSignOutEverywhereErrorCode;
  },
): Promise<InternalApiDeleteAccountResult | InternalApiResult> {
  const response = await fetch(`${getInternalApiUrl()}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  let responsePayload: unknown = null;

  try {
    responsePayload = await response.json();
  } catch {
    responsePayload = null;
  }

  const parsedResponse = responseSchema.safeParse(responsePayload);

  if (!response.ok) {
    const parsedError =
      parsedResponse.success && "error" in parsedResponse.data
        ? parsedResponse.data
        : null;

    return {
      ok: false,
      error: errorCodeSchema.parse(parsedError?.error ?? "internal_api_error"),
      message: parsedError?.message ?? "The internal API request failed.",
      status: response.status,
    };
  }

  const parsedSuccess =
    parsedResponse.success && "ok" in parsedResponse.data
      ? parsedResponse.data
      : null;

  if (!parsedSuccess) {
    return {
      ok: false,
      error: errorCodeSchema.parse("internal_api_error"),
      message: "The internal API returned an unexpected response.",
      status: response.status,
    };
  }

  return { ok: true };
}
