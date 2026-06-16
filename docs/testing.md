# Testing

This repo has three main test surfaces:

- API tests
- Dev E2E tests
- Prod E2E tests

Use the explicit `:smoke`, `:all`, and `:focus` commands where possible. The shorter aliases still exist for convenience.

## Top-level

- `npm run test:all`
  - Runs the full test surface in sequence:
  - `test:api:all`
  - `test:e2e:all`
  - `test:e2e:prod:all`
  - Prints per-group duration and total elapsed time at the end

- `npm run test-all`
  - Legacy alias for `npm run test:all`

## API

- `npm run test:api`
  - Alias for `npm run test:api:all`

- `npm run test:api:all`
  - Runs all API test scripts
  - Prints per-script duration and total elapsed time

- Focused API commands:
  - `npm run test:api:routes`
  - `npm run test:api:modules`
  - `npm run test:api:next-proxy:workspaces`
  - `npm run test:api:next-proxy:module-lab`
  - `npm run test:api:next-proxy:workspace-files`
  - `npm run test:api:next-proxy:workspace-file-item-routes`
  - `npm run test:api:workspace-compat`
  - `npm run test:api:storage`
  - `npm run test:api:env:dev`
  - `npm run test:api:integration:account`
  - `npm run test:api:integration:workspace`

## Dev E2E

- `npm run test:e2e`
  - Alias for `npm run test:e2e:smoke`

- `npm run test:e2e:smoke`
  - Main dev browser smoke run
  - Uses `workspace-files`

- `npm run test:e2e:all`
  - Runs all dev E2E scripts in sequence
  - Prints per-script duration and total elapsed time

- Module and focused dev E2E commands:
  - `npm run test:e2e:auth`
  - `npm run test:e2e:security`
  - `npm run test:e2e:module-lab`
  - `npm run test:e2e:module-lab-disabled`
  - `npm run test:e2e:combined`
  - `npm run test:e2e:no-modules`

## Prod E2E

- `npm run test:e2e:prod`
  - Alias for `npm run test:e2e:prod:smoke`

- `npm run test:e2e:prod:prepare`
  - Builds the app with the E2E env before prod-style browser runs

- `npm run test:e2e:prod:smoke`
  - Main prod browser smoke run
  - Uses `workspace-files`

- `npm run test:e2e:prod:all`
  - Runs the current prod E2E suites in sequence:
  - `test:e2e:prod:smoke`
  - `test:e2e:prod:auth:focus`
  - `test:e2e:prod:workspace-files:focus`
  - `test:e2e:prod:module-lab`
  - Prints per-script duration and total elapsed time

- Focused prod E2E commands:
  - `npm run test:e2e:prod:auth:focus`
  - `npm run test:e2e:prod:workspace-files:focus`
  - `npm run test:e2e:prod:module-lab`

## Module Enablement

Some browser suites depend on `ENABLED_MODULES`.

- `workspace-files` tests run when `workspace-files` is included
- `module-lab` tests run when `module-lab` is included
- `module-lab-disabled` is the inverse smoke case

The Playwright runners accept `--enabled-modules=...` and that value is intended to override the default env-file value for the run.

## Notes

- `check:infra` and `check:storage` are health checks, not part of `test:all`
- Prod E2E runs are heavier and more sensitive to local environment issues
- On Windows, if `.next` is locked, stop running Next processes before rerunning prod-style builds/tests
- Prefer `npm run ...` entrypoints instead of calling the Node wrappers directly
