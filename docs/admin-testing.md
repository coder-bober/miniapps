# Admin Testing

The app-admin workspace tools are for manual testing and development. They are disabled unless the server environment explicitly allowlists one or more authenticated user emails.

## Enable App-Admin Access

Set `APP_ADMIN_EMAILS` in the environment used by the web and API processes:

```env
APP_ADMIN_EMAILS=admin@example.com
```

Multiple emails are comma-separated:

```env
APP_ADMIN_EMAILS=admin@example.com,qa-admin@example.com
```

The allowlist is matched server-side against the authenticated user's email. Entries are trimmed and lowercased. Empty or missing values deny all users.

## Manual Setup

1. Create or choose a normal Supabase Auth user for manual testing.
2. Add that user's email to `APP_ADMIN_EMAILS`.
3. Restart the web/API processes so the environment is reloaded.
4. Sign in as that user.
5. Open the personal workspace page.

The personal workspace overview shows admin testing tools only for allowlisted users. The first slice can inspect the first 10 workspaces, list members, change existing non-owner member roles between `admin` and `member`, and change ModuleLab access between no access, `viewer`, and `operator`.

## Safety Notes

- Do not commit real app-admin emails, passwords, service-role keys, or local `.env` files.
- Leave `APP_ADMIN_EMAILS` unset in environments where manual app-admin testing is not intended.
- This is not production-grade RBAC. If the feature becomes product-facing, replace the env allowlist with a database-backed admin model and audit logging.
