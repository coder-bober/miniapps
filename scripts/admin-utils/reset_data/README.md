# Reset Data Admin Utility

Run from the project root:

```sh
node scripts/admin-utils/reset_data/reset-data.mjs --yes
```

The default `config.mjs` loads E2E env files:

```js
useEnv: [".env.api.e2e.local", ".env.e2e.local"]
```

For local dev, change it to:

```js
useEnv: [".env.api.local", ".env.local"]
```

`useSqlFiles` is ordered. The default reset runs:

```js
useSqlFiles: [
  "docs/SQL/reset-supabase-full.sql",
  "docs/SQL/bootstrap-supabase-initial.sql",
]
```

The script also clears configured public app tables, deletes auth users through the Supabase Admin API, clears the configured S3-compatible storage bucket, and flushes the Redis DB from `REDIS_URL`.

The last run result is written to `last-run.json` in this folder.

SQL execution is attempted first. By default the script tries:

- the Supabase pg-meta endpoint when Basic auth is available through `SUPABASE_SQL_BASIC_AUTH`, `SUPABASE_META_BASIC_AUTH`, `DASHBOARD_USERNAME`/`DASHBOARD_PASSWORD`, or config values
- a trusted Supabase RPC named `exec_sql`

If neither SQL path is available and `sql.required` is `false`, the script records skipped SQL steps and falls back to service-role data cleanup.
