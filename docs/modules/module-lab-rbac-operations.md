# Module-Lab RBAC Operations

## Purpose

`module-lab` is the first live example of module-scoped RBAC in this repo.

It is useful as:
- a reference implementation for future modules like `blog`
- a quick environment check that module roles, Next proxy checks, Fastify checks, and queue authorization all agree

## Current roles

`module-lab` currently supports two roles:

- `viewer`
  - can read the authenticated diagnostics surface
  - cannot queue module jobs
- `operator`
  - can read the authenticated diagnostics surface
  - can queue module jobs

If a signed-in user has no `module-lab` role row, they:
- can still open the public `/[locale]/module-lab` page
- cannot access the authenticated diagnostics surface

## Current capabilities

The role map currently resolves to:

- `viewer`
  - `module-lab.read`
- `operator`
  - `module-lab.read`
  - `module-lab.run_job`

## SQL setup

The required schema is the workspace-scoped RBAC schema:

- `workspaces`
- `workspace_memberships`
- `workspace_module_roles`

Apply the bootstrap/migration SQL documented in `docs/SQL/workspace-module-roles-notes.md` before running the `module-lab` RBAC browser suite.

## Assigning a role by email

Create or update a row in `public.workspace_module_roles` for the selected workspace and user.

For `module-lab`, typical values are:

- `module_id = 'module-lab'`
- `role = 'viewer'`
  or
- `role = 'operator'`

## Expected behavior by user state

Unsigned visitor:
- public page renders
- SEO-visible public content is available
- no authenticated diagnostics controls

Signed-in user with no role:
- public page still renders
- restricted note is shown
- diagnostics list is hidden
- queue action is unavailable

Signed-in `viewer`:
- diagnostics surface loads
- queue action is disabled
- read-only notice is shown

Signed-in `operator`:
- diagnostics surface loads
- queue action is available
- job enqueue succeeds

## Error behavior

The Next proxy and Fastify backend both enforce the same capability model.

Current stable RBAC error:

- `module_capability_required`

Examples:
- missing `module-lab.read`
- missing `module-lab.run_job`

## Useful verification commands

- `npm run test:api`
- `npm run test:e2e:module-lab`

The dedicated browser suite now also checks direct proxy `403` behavior for:
- `viewer` trying to queue a job
- signed-in no-role user trying to load authenticated status

## Troubleshooting

### `workspace_module_roles` is missing

Symptoms:
- `test:e2e:module-lab` fails early with an RBAC fixture/preflight message
- signed-in users fall back to no module capabilities

Fix:
- apply the workspace-scoped RBAC bootstrap/migration SQL documented in `docs/SQL/workspace-module-roles-notes.md`
- rerun:
  - `npm run test:e2e:module-lab`

### `module-lab` is disabled

Symptoms:
- public header link is absent
- `/api/module-lab` returns `404`
- the dedicated `module-lab` browser suite should not be used unless it explicitly enables the module

Check:
- test scripts set module state explicitly with `--enabled-modules=...`
- local `.env.local` does not control the module set for dedicated test scripts

Useful commands:
- `npm run test:e2e:module-lab`
- `npm run test:e2e:module-lab-disabled`

### Unexpected `module_capability_required`

If a signed-in user gets:
- `requiredCapability = module-lab.read`
  - the user is not a member of the requested workspace
  - or the user has no valid workspace-scoped `module-lab` role row where operator capabilities are required
- `requiredCapability = module-lab.run_job`
  - the user is a `viewer`
  - or otherwise lacks operator access

Verify the current assignment in `public.workspace_module_roles` for the requested workspace.

Expected valid roles for `module-lab`:
- `viewer`
- `operator`

### Test suites and module state

Do not rely on `.env.local` to decide which modules browser tests should use.

Current dedicated scripts already encode the intended state:
- `npm run test:e2e:module-lab`
- `npm run test:e2e:module-lab-disabled`

This keeps RBAC/browser coverage stable even if local dev uses a different `ENABLED_MODULES` value.
