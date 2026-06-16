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

## Commit message rules

- Use Conventional Commits 1.0.0 for every commit.
- Format: `<type>[optional scope]: <description>`.
- Use `fix:` for bug fixes and `feat:` for new features.
- Other allowed types include `build:`, `chore:`, `ci:`, `docs:`, `refactor:`, `test:`, `style:`, and `perf:`.
- Use an optional scope when it clarifies the affected area, for example `fix(auth): ...`.
- Put longer context in the body after a blank line.
- Mark breaking changes with `!` before the colon or a `BREAKING CHANGE:` footer.
