# AGENTS.md

## Prod E2E test findings

- `test:e2e:prod` auth failures were mostly not app regressions; they were test timing issues around Next server-action redirects.
- For prod auth flows, `page.waitForLoadState("networkidle")` was too brittle.
- The reliable fix was to wait for the real redirect outcome instead, for example:
  - `/en/workspace`
  - `/en/sign-in?...`
  - `/en/settings?passwordMessage=...`
  - `/en/settings?deleteError=...`
- The shared `signInWithPassword()` helper must not return just because the page is still `/sign-in`; it should wait for either:
  - success redirect to `/workspace`
  - or an error redirect on `/sign-in?...`
- There was also a real logout bug:
  - `GET /auth/sign-out` was linked from UI with prefetchable links
  - this could silently log the user out
  - fix: add `prefetch={false}` to those logout links
