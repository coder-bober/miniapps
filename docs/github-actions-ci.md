# GitHub Actions CI

This repo uses `.github/workflows/ci.yml` for automated verification.

## Jobs

1. `quality`
   - `npm ci`
   - `npm run lint`
   - `npm run build`

2. `e2e`
   - installs Playwright Chromium
   - runs `npm run test:e2e`
   - runs `npm run test:e2e:auth`

## Required GitHub Secrets

- `E2E_SUPABASE_URL`
- `E2E_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `E2E_SUPABASE_SERVICE_ROLE_KEY`

## Notes

- The workflow is designed for the dedicated Supabase test project, not dev or production.
- `NEXT_PUBLIC_SITE_URL` is set to `http://localhost:3000` in CI to match Playwright and the auth callback flow.
- The auth suite uses the service role key only in test code under `tests/`.
