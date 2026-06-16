import { ChangePasswordCard } from "@/components/settings/change-password-card";
import { DeleteAccountCard } from "@/components/settings/delete-account-card";
import { SessionManagementCard } from "@/components/settings/session-management-card";
import type { Locale } from "@/lib/i18n/config";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";
import type { AuthenticatedUser } from "@/types/auth";

type SettingsPageStatus = {
  passwordError?: string;
  passwordMessage?: string;
  sessionError?: string;
  deleteError?: string;
};

type SettingsPageContentProps = {
  locale: Locale;
  dictionary: SiteDictionary;
  user: AuthenticatedUser;
  status: SettingsPageStatus;
  changePasswordAction: (formData: FormData) => void | Promise<void>;
  signOutEverywhereAction: (formData: FormData) => void | Promise<void>;
  deleteAccountAction: (formData: FormData) => void | Promise<void>;
};

export function SettingsPageContent({
  locale,
  dictionary,
  user,
  status,
  changePasswordAction,
  signOutEverywhereAction,
  deleteAccountAction,
}: SettingsPageContentProps) {
  return (
    <>
      <ChangePasswordCard
        locale={locale}
        dictionary={dictionary.app.settings.security}
        action={changePasswordAction}
        error={status.passwordError}
        message={status.passwordMessage}
      />
      <SessionManagementCard
        locale={locale}
        dictionary={dictionary.app.settings.sessions}
        action={signOutEverywhereAction}
        error={status.sessionError}
      />
      <DeleteAccountCard
        locale={locale}
        user={user}
        dictionary={dictionary.app.settings.dangerZone}
        action={deleteAccountAction}
        error={status.deleteError}
      />
    </>
  );
}
