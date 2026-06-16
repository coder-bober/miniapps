# Repository review: modular mini-app prototype

Date: 2026-05-30

## Scope

This review was based on a source walk-through of the current repository, with focus on the stated product direction:

1. separation of modules for testability and maintainability;
2. workspaces, including a per-user default/personal workspace;
3. users with different workspace access rights, sharing, and ownership transfer;
4. future mini apps composed from modules.

I also checked the repository state. The repo is already initialized as a git repository on branch `main`; this review adds `docs/reviews/repository-review-2026-05-30.md`.

## High-level understanding

This is a Next.js + Fastify modular-monolith prototype.

Main surfaces:

- `src/app`: Next.js app routes and thin API proxy routes.
- `src/core`: app-wide platform primitives such as route wrappers, workspace shell context, module page shells, and authz helpers.
- `src/modules`: frontend module implementations. Current examples are `workspace-files` and `module-lab`.
- `src/shared`: shared contracts and cross-runtime helpers, including API schemas and module capability definitions. Several `.ts` files re-export `.mjs` runtime implementations so both Next/TypeScript and Node ESM code can share logic.
- `api`: standalone Fastify backend, with platform routes under `api/routes`, module routes/jobs under `api/modules`, and Supabase-backed service implementation under `api/services/supabase.mjs`.
- `tests` and `api/tests`: Playwright/browser tests plus Node API and proxy-route tests.
- `docs`: extensive architecture/migration notes, SQL, and operational testing docs.

Approximate source size excluding `.git`, `.next`, `node_modules`, coverage, and test output:

- `src`: 105 files / 9,056 lines
- `api`: 45 files / 7,161 lines
- `tests`: 15 files / 1,742 lines
- `scripts`: 21 files / 906 lines
- `docs`: 46 files / 6,528 lines

Initial non-interactive shells did not have `npm`/`npx` on PATH. Loading nvm with `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"` exposes Node v24.15.0 with npm/npx 11.12.1. `npm run lint` was run successfully after loading nvm.

## What is working well

### 1. The intended modular-monolith boundary is explicit

The repo has clear architecture docs (`docs/modular-monolith-plan.md`) and matching folder conventions:

- platform/core code goes into `src/core` and `api/core`;
- domain-owned code goes into `src/modules/<module-id>` and `api/modules/<module-id>`;
- shared API and module contracts live under `src/shared`.

This is the right direction for a prototype that wants future mini apps built from modules without prematurely splitting into many deployables.

### 2. Modules have declared extension points instead of scattered hooks

Frontend modules register through `src/modules/registry.ts` using an `AppModuleManifest` shape from `src/shared/modules/module-manifest.ts`. Backend modules register through `api/modules/registry.mjs` and can contribute routes and jobs.

Good examples:

- frontend registry filters app modules with `filterEnabledModules`;
- backend registry filters API modules with the same enabled-module helper;
- backend registry validates duplicate module IDs, invalid route hooks, duplicate job IDs, and unknown job handlers.

This is a strong foundation for “mini apps based on modules”.

### 3. Module enablement is simple and cross-runtime

`src/shared/modules/enabled-modules.mjs` implements an allowlist based on `ENABLED_MODULES`:

- unset means all registered modules enabled;
- set to a comma-separated value means only listed modules enabled;
- set to empty means no modules enabled.

Both frontend and backend import this helper. That keeps behavior consistent and testable. The docs also explicitly cover disabled module behavior: hide navigation, do not register backend routes/jobs, and return 404 from explicit Next file routes.

### 4. Route entry files are mostly thin

Next route files such as `src/app/api/workspaces/[workspaceId]/members/route.ts` only instantiate handler factories and export `GET`/`POST`. The actual proxy logic lives in adjacent `route-handlers.mjs`, which makes it easier to test outside Next internals.

Fastify app composition in `api/app.mjs` is also clean: build app, register plugins, register platform routes, then register module routes.

### 5. Workspace concepts are becoming first-class

The code and docs have moved beyond a string-only `workspace_slug` model:

- SQL/docs introduce `workspaces`, `workspace_memberships`, and `workspace_module_roles`;
- service methods distinguish personal and shared workspaces;
- `listUserWorkspaces`, `createSharedWorkspace`, member management, and ownership transfer already exist;
- the docs correctly identify `default` as a compatibility placeholder for the user’s personal workspace.

That matches the stated requirement that each user has at least one default workspace while also supporting sharing and transfer.

### 6. Test surface is broader than typical prototypes

There are API tests, Next proxy-route tests, module enable/disable tests, auth tests, security tests, and prod-style E2E runners. `docs/testing.md` documents the intended entrypoints. This is especially useful for a modular architecture because regressions often happen at the boundaries between module manifests, route guards, proxy routes, and backend registrations.

### 7. Security-aware separation exists

The Next API proxy routes fetch the Supabase session server-side, verify the user, and forward only a bearer token to the Fastify backend. There is also a dedicated service-role exposure test doc and test file, which is a good sign for a Supabase-backed app.

## Main implementation concerns

### 1. `api/services/supabase.mjs` is too large and mixes many responsibilities

`api/services/supabase.mjs` is 931 lines and currently owns many domains:

- Supabase client creation;
- account actions;
- workspace listing/creation;
- member management;
- ownership transfer;
- module-role lookup;
- workspace-file queries;
- thumbnail state mutation;
- compatibility fallbacks for old schemas.

This is the biggest maintainability risk. It makes unit testing harder because any test that wants one service may have to understand a huge service factory and many mocked Supabase query chains. It also undermines the otherwise good module boundary: `workspace-files` has module routes/services, but core Supabase service still contains most persistence logic for files and workspaces.

Recommended direction:

- split into focused service modules, e.g. `workspaceService`, `workspaceMemberService`, `workspaceFileRepository`, `moduleAccessService`, `accountService`;
- keep one Fastify service plugin if desired, but compose it from smaller units;
- move module-owned persistence closer to `api/modules/<module-id>/services` where possible.

### 2. Workspace authorization is still transitional and incomplete for shared workspaces

The docs describe the intended two-layer model: workspace membership first, then module-specific capabilities. The current implementation only partially reflects that.

Examples:

- `getWorkspaceMembershipRole` exists and member-management endpoints require ownership for mutating shared workspace membership.
- `getUserWorkspaceModuleRole` exists, but the capability model still appears split between old user-level module roles and newer workspace module roles.
- Workspace-file queries still filter by `user_id` in addition to workspace fields. That preserves personal-file semantics but may prevent true shared workspace file visibility if every member should see workspace files.
- `resolveWorkspaceContext` returns a supplied `workspaceId` without checking that the user is a member of it. Callers must remember to enforce access later.

Recommended direction:

- centralize workspace access checks in one helper such as the planned `getUserModuleAccess(userId, workspaceId, moduleId)`;
- make module services consume an access context rather than raw `userId`/`workspaceId` pairs;
- decide explicitly whether `workspace-files` files are per-user-within-workspace or shared-by-workspace, and encode that in names and tests.

### 3. Ownership transfer is not atomic at the application level

`transferWorkspaceOwnership` uses a two-row Supabase upsert to demote the old owner and promote the new owner. This is compact, but ownership is an invariant that should be enforced transactionally: a workspace should have exactly one owner at all times.

Risk scenarios include partial failure, concurrent transfers, or database constraints that reject one side while accepting/rolling back behavior is unclear from the client code alone.

Recommended direction:

- implement ownership transfer as a database RPC/stored procedure or transaction-backed backend operation;
- keep a partial unique index/constraint ensuring one owner per workspace;
- test concurrent transfer and failure cases.

### 4. Shared `.mjs` + `.ts` contract pattern works but is easy to drift

Several TypeScript files are thin re-exports of `.mjs` implementations, for example `src/shared/modules/enabled-modules.ts` re-exports `enabled-modules.mjs`. This solves cross-runtime reuse, but it means type safety depends on separate type declarations or inferred JS behavior.

Risks:

- runtime `.mjs` can change without TypeScript catching contract drift;
- imports like `../../src/shared/modules/enabled-modules.mjs` from backend code couple `api` to `src` layout;
- future contributors may not know when to add `.mjs`, `.ts`, or both.

Recommended direction:

- document the pattern in a short `src/shared/README.md`;
- consider moving true cross-runtime packages to a neutral top-level package/folder, e.g. `shared/`, if the repo grows;
- add focused tests for shared helpers because TypeScript alone will not cover `.mjs` behavior.

### 5. Next proxy route handlers need consistent validation error handling

The proxy handler factory pattern is good, but some handlers parse request bodies before contacting the backend. For example, `createWorkspaceMembersRouteHandlers.POST` does:

```js
const requestPayload = addWorkspaceMemberRequestSchema.parse(await request.json().catch(() => ({})));
```

If parsing fails, the handler throws instead of returning the same stable 400 response shape the Fastify backend returns.

Recommended direction:

- use `safeParse` in proxy handlers or wrap parsing in a shared helper;
- return consistent `{ error, message }` JSON for invalid client input;
- add a proxy-route test that sends invalid JSON/body for each mutating route.

### 6. Compatibility fallbacks can hide migration problems

Several Supabase service methods catch missing-table/missing-column errors and return fallback behavior, such as a synthetic `Personal workspace` with `id: null` or legacy `workspace_slug` queries.

This is useful during migration, but dangerous long-term because production can silently run in a degraded compatibility mode if migrations are missing.

Recommended direction:

- keep compatibility fallbacks only behind an explicit migration/legacy flag;
- log a clear warning/metric when fallbacks are used;
- define a removal milestone in docs and tests.

### 7. Build artifacts are present in the working tree even though `.gitignore` ignores them

`search_files` showed many `.next` files in the working directory. `.gitignore` excludes `/.next/`, so they are probably untracked build artifacts, but they make inspection noisy and can confuse tooling if a script walks the filesystem directly.

Recommended direction:

- clean local build artifacts before committing/reviewing (`rm -rf .next` if safe for the current workflow);
- keep scripts using `git ls-files` or explicit skip lists for repo analysis.

### 8. Current working tree already had unrelated modifications

Before adding this review, `git status --short --branch` showed:

```text
## main
 M .gitignore
 M AGENTS.md
 D README.md
 M package-lock.json
 M package.json
```

Those changes pre-existed this review. I did not inspect them as intentional changes, and I did not modify them.

## Notes on mini-app readiness

The current module system is a good start for “mini apps”, but it is still closer to module enablement than full mini-app composition.

What exists now:

- module manifests;
- module navigation/page surfaces;
- backend route/job contribution;
- environment-based module allowlisting;
- module-level capabilities.

What is still missing for robust mini apps:

- a first-class mini-app manifest that composes multiple modules;
- per-workspace enabled modules or mini-app bundles;
- per-workspace module configuration/state;
- lifecycle hooks for install/uninstall/migrate/seed;
- clear dependency declarations between modules;
- UI and API conventions for module-to-module communication.

Recommended next design step: define the difference between a **module** and a **mini app**. A likely model is:

- Module: a bounded capability package with routes, pages, jobs, permissions, storage, and contracts.
- Mini app: a configured bundle of modules enabled for a workspace, with its own navigation/layout, workspace settings, and access policy.

## Prioritized recommendations

### P0 / before relying on shared workspaces heavily

1. Make workspace access evaluation central and mandatory for module operations.
2. Make ownership transfer transactional and backed by database constraints.
3. Decide and document whether workspace files are user-private inside a workspace or shared among workspace members.

### P1 / before adding more modules

1. Split `api/services/supabase.mjs` into smaller services/repositories.
2. Create a short module authoring guide that covers frontend manifest, backend manifest, routes, jobs, permissions, tests, and shared contract files.
3. Add invalid-input tests for Next proxy routes and standardize validation responses.
4. Add registry invariant tests on both frontend and backend module registries.

### P2 / before mini-app composition

1. Introduce a mini-app manifest distinct from module manifests.
2. Move from global `ENABLED_MODULES` toward workspace-scoped module/mini-app enablement.
3. Add module dependency declarations and validation.
4. Add lifecycle conventions for module setup/migrations.

## Verdict

Good prototype direction overall. The repository already shows a thoughtful modular-monolith shape, useful documentation, explicit module registries, shared contracts, route-handler factories for testability, and a real workspace/RBAC migration path.

The main risks are concentrated in the transitional backend service layer and authorization model. If the project keeps adding modules without first centralizing workspace access and splitting the large Supabase service, the current clean architecture could erode into a hard-to-test service blob. Addressing those two areas would make the repo much better prepared for workspace sharing and future mini-app composition.
