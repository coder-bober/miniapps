type RawSettingsSearchParams = {
  passwordError?: string;
  passwordMessage?: string;
  sessionError?: string;
  deleteError?: string;
};

export type SettingsPageState = {
  passwordError?: string;
  passwordMessage?: string;
  sessionError?: string;
  deleteError?: string;
};

function readOptionalParam(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : undefined;
}

export function resolveSettingsPageState(
  searchParams: RawSettingsSearchParams,
): SettingsPageState {
  return {
    passwordError: readOptionalParam(searchParams.passwordError),
    passwordMessage: readOptionalParam(searchParams.passwordMessage),
    sessionError: readOptionalParam(searchParams.sessionError),
    deleteError: readOptionalParam(searchParams.deleteError),
  };
}
