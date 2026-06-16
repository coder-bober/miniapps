# Fastify API Migration Done

## Scope completed

The repository now includes a minimal Fastify backend boundary, with account deletion moved out of the Next.js runtime and into the API service.

This completes the first migration step from the original Fastify API plan.

## Implemented architecture

The repo is now split into:

- `src/` for the Next.js web app
- `api/` for the Fastify service

This keeps the product UI in Next.js while introducing a backend-owned path for privileged operations.

## Fastify service added

Implemented files:

- `api/app.mjs`
- `api/server.mjs`
- `api/config.mjs`
- `api/supabase.mjs`
- `api/routes/health.mjs`
- `api/routes/account.mjs`

Current API routes:

- `GET /health`
- `POST /v1/account/delete`

## Account deletion moved to Fastify

Account deletion is no longer performed directly in Next.js with the service-role key.

Current flow:

1. User submits the delete-account form in the Next.js settings page
2. Next.js reads the current Supabase session
3. Next.js sends the request to the Fastify API with the Supabase access token
4. Fastify verifies the token with Supabase
5. Fastify validates the typed confirmation email
6. Fastify deletes the user through Supabase Admin API
7. Next.js signs the user out locally and redirects

## Backend-owned secrets

After the migration:

- `SUPABASE_SERVICE_ROLE_KEY` is owned by the Fastify API service
- the Next.js app no longer needs that key for account deletion

Relevant runtime files:

- `api/supabase.mjs`
- `api/routes/account.mjs`
- `src/lib/api/internal.ts`
- `src/app/[locale]/(app)/settings-actions.ts`

## Internal API client added in Next.js

Implemented file:

- `src/lib/api/internal.ts`

Purpose:

- call the Fastify backend from trusted server-side Next.js code
- keep the UI layer decoupled from backend deletion details

## Scripts added

Implemented scripts in `package.json`:

- `dev:api`
- `dev:web`
- `dev`
- `test:api`

Current behavior:

- `npm run dev` starts both the API and the web app
- `npm run test:api` runs direct API tests

## Local env loading added for the API

Implemented files:

- `scripts/load-env.mjs`
- `scripts/dev.mjs`

Updated file:

- `api/server.mjs`

Current behavior:

- the Fastify API loads `.env.local` and `.env.e2e.local`
- local development can run the API without separate manual env bootstrapping

## Playwright updated for two services

Updated file:

- `playwright.config.ts`

Current behavior:

Playwright starts both:

1. Fastify API
2. Next.js web app

This means auth E2E now exercises the real frontend -> backend -> Supabase path for account deletion.

## API tests added

Implemented file:

- `api/tests/account-delete.test.mjs`

Covered cases:

1. `GET /health` returns success
2. delete request without authorization is rejected
3. confirmation mismatch is rejected
4. successful delete calls the backend service

## Existing E2E coverage retained and extended

The account deletion feature is covered by browser E2E in:

- `tests/auth/account-deletion.spec.ts`

Covered behavior:

- wrong email confirmation does not delete the account
- the account and profile still exist after failed confirmation
- successful deletion removes the auth user
- successful deletion removes the profile row
- deleted user loses access to protected routes
- deleted credentials can no longer sign in

## Docs updated

Updated:

- `docs/account-deletion-server-env.md`
- `docs/tests/security/service-role-exposure-test.md`

These now reflect that privileged account deletion is API-owned rather than Next-owned.

## Validation completed

Validated during implementation:

- `npm run lint`
- `npm run build`
- `npm run test:api`
- `npm run test:e2e:auth`

## Result

The repository now has a real backend process and a real backend-owned privileged feature.

This provides a practical starting point for future work such as:

- more backend-owned account/security actions
- public API routes
- workers and scheduled jobs
- stronger frontend/backend separation over time
