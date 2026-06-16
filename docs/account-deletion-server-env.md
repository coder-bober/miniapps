# Account Deletion Server Environment

## Purpose

The account-deletion feature uses Supabase Admin API to delete the authenticated user from `auth.users`.

That operation requires a privileged server-side key:

- `SUPABASE_SERVICE_ROLE_KEY`

This key must not be exposed to the browser.

## Recommended setup

Use the service role key only in trusted server runtime environments:

- local development server env if you want to test deletion locally
- staging server env
- production server env

Do not expose it through:

- `NEXT_PUBLIC_*`
- client-side code
- browser-accessible configuration

## Current code path

The app uses:

- `api/routes/account.mjs`
- `api/supabase.mjs`
- `src/app/[locale]/(app)/settings-actions.ts`

Behavior:

- Next.js calls the internal Fastify API
- Fastify verifies the current Supabase access token
- Fastify performs the privileged deletion with `SUPABASE_SERVICE_ROLE_KEY`
- if the API is unavailable or misconfigured, Next.js returns a controlled settings error instead of crashing

## Local development

If you want account deletion to work locally, put the API-only secret in a separate API env file:

```env
# .env.api.local
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

The Fastify API can also read shared non-secret values from `.env.local`, for example:

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

For E2E, the same split is supported:

```env
# .env.api.e2e.local
SUPABASE_SERVICE_ROLE_KEY=your_test_service_role_key_here
```

and shared test values can stay in:

```env
# .env.e2e.local
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=...
```

For normal local development:

- `npm run dev` now starts both:
  - the Next.js web app
  - the Fastify API

For normal local development, the Fastify API loads env files in this order:

1. `.env.api.local`
2. `.env.local`

That means API-specific local values override shared local values where both define the same key.

For Playwright E2E:

- Playwright loads `.env.e2e.local` and `.env.api.e2e.local`
- it passes the merged env to the API process
- production-oriented runtime code does not read E2E env files directly

If you start only the web app without the API, account deletion will fail with a controlled "not configured" style error because the internal backend route is unavailable.

The key is still sensitive and should never be committed.

## Production deployment

Set `SUPABASE_SERVICE_ROLE_KEY` as a server-only secret for the Fastify API process in your hosting platform.

Examples:

- Vercel project environment variables
- Railway service variables
- Docker/container runtime secrets
- self-hosted process manager secrets

Do not place it in any client-exposed config path.

## Why this is acceptable

Using the service role key in backend-only runtime code is normal for operations that require Supabase admin privileges.

The important boundary is not “never use the key in production”.
The important boundary is:

- never expose the key to the browser
- never use it in client components
- never serialize it into rendered output or public assets

The repository now includes a security test for this:

- `tests/security/service-role-exposure.spec.ts`

Run:

1. `npm run build`
2. `npm run test:e2e:security`

## Alternative architecture

If you do not want the Next.js server runtime to hold the service role key at all, move account deletion into:

- a Supabase Edge Function
- or another trusted backend service

That is not the current implementation.
