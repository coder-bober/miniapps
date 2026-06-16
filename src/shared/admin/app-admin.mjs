export function parseAppAdminEmails(allowlist) {
  if (typeof allowlist !== "string") {
    return [];
  }

  return Array.from(
    new Set(
      allowlist
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

export function isAppAdminEmail(email, allowlist = process.env.APP_ADMIN_EMAILS) {
  if (typeof email !== "string") {
    return false;
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return false;
  }

  return parseAppAdminEmails(allowlist).includes(normalizedEmail);
}
