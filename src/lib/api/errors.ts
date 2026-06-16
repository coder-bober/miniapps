import type {
  AccountDeleteErrorCode,
  AccountSignOutEverywhereErrorCode,
} from "@/shared/api/account";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";

export function getDeleteAccountErrorMessage(
  error: AccountDeleteErrorCode,
  dictionary: SiteDictionary,
) {
  switch (error) {
    case "confirmation_mismatch":
      return dictionary.auth.messages.accountDeletionMismatch;
    case "authorization_required":
    case "invalid_session":
      return dictionary.auth.messages.accountDeletionUnavailable;
    case "account_deletion_failed":
    case "internal_api_error":
      return dictionary.auth.messages.accountDeletionFailed;
  }
}

export function getSessionSignOutEverywhereErrorMessage(
  error: AccountSignOutEverywhereErrorCode,
  dictionary: SiteDictionary,
) {
  switch (error) {
    case "authorization_required":
    case "invalid_session":
    case "global_sign_out_failed":
    case "internal_api_error":
      return dictionary.auth.messages.sessionSignOutEverywhereFailed;
  }
}
