import type { SiteDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { EmailActionCard } from "@/components/auth/email-action-card";

type CheckEmailCardProps = {
  locale: Locale;
  dictionary: SiteDictionary["auth"];
  action: (formData: FormData) => void | Promise<void>;
  email?: string;
  error?: string;
  message?: string;
};

export function CheckEmailCard({
  locale,
  dictionary,
  action,
  email,
  error,
  message,
}: CheckEmailCardProps) {
  return (
    <EmailActionCard
      locale={locale}
      title={dictionary.checkEmail.title}
      description={`${dictionary.checkEmail.description} ${dictionary.checkEmail.resendDescription}`}
      submitLabel={dictionary.actions.resendConfirmation}
      emailLabel={dictionary.checkEmail.emailLabel}
      action={action}
      email={email}
      error={error}
      message={message}
      footerLinks={[
        { href: `/${locale}/sign-in`, label: dictionary.actions.backToSignIn },
        { href: `/${locale}/sign-up`, label: dictionary.actions.createAnotherAccount },
      ]}
    />
  );
}
