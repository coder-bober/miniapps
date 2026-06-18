# Test suite manifest refactor plan

Status: completed on 2026-06-18.

## Goal

Create one source of truth for test suite commands, module flags, production/dev mode, and aggregate ordering.

The current setup spreads that information across `package.json`, `scripts/run-api-tests.mjs`, `scripts/run-e2e-tests.mjs`, `scripts/run-e2e-prod-tests.mjs`, and `scripts/run-all-tests.mjs`. That makes suite membership easy to update in one place and forget in another.

## Scope

- Add a shared suite manifest in `scripts/`.
- Add a generic suite runner that can execute one suite by id.
- Keep existing npm script names stable for users and CI.
- Make aggregate runners execute manifest-defined child suites.
- Preserve existing output style with per-suite duration summaries.
- Do not change test behavior, module enablement, Playwright output folders, or production build behavior.

## Proposed structure

- `scripts/test-suite-manifest.mjs`
  - Defines all runnable suites.
  - Defines aggregate suites and their ordered children.
  - Stores command arrays instead of shell strings.
- `scripts/test-suite-runner.mjs`
  - Shared `formatDuration`, command spawning, and recursive aggregate execution.
  - Emits progress lines using the existing `[test:...] completed in ...` format.
- `scripts/run-test-suite.mjs`
  - Thin CLI entry point: `node scripts/run-test-suite.mjs <suite-id>`.
- Existing aggregate files
  - `run-all-tests.mjs`, `run-api-tests.mjs`, `run-e2e-tests.mjs`, and `run-e2e-prod-tests.mjs` delegate to the shared runner.

## Suite id convention

- Use ids without the leading npm `test:` prefix:
  - `all`
  - `api:all`
  - `api:routes`
  - `e2e:all`
  - `e2e:smoke`
  - `e2e:prod:all`
  - `e2e:prod:module-lab`
- Each manifest entry also stores the npm-facing label, for example `test:e2e:smoke`, so logs remain familiar.

## Implementation steps

1. Create the manifest and shared runner.
2. Convert aggregate runner scripts to call the shared runner.
3. Replace package scripts with `node scripts/run-test-suite.mjs <suite-id>` aliases.
4. Verify representative direct suites:
   - `npm run test:api:app-admin-access`
   - `npm run test:e2e:module-lab-disabled`
5. Verify aggregate wiring without rerunning the full suite when possible:
   - `node --check` on changed scripts.
   - Inspect `npm run` script names and manifest ids.

## Risks and mitigations

- Risk: changing npm scripts could break CI or user muscle memory.
  - Mitigation: keep every existing npm script name.
- Risk: production E2E build behavior could change.
  - Mitigation: keep prod entries invoking `scripts/run-playwright-prod.mjs`, which still performs `test:e2e:prod:prepare` before Playwright.
- Risk: aggregate logs could become less clear.
  - Mitigation: keep the current `[test:group] child completed in ...` summary format.

## Completion criteria

- All existing `test:*` npm script names still exist.
- Test command definitions live in the manifest.
- Aggregate runner scripts no longer duplicate suite lists or spawn helpers.
- Representative direct suites pass.
- Changelogs mention the test infrastructure refactor.
