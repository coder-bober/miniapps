# Module-Scoped RBAC Plan

## Goal

Add module-scoped authorization without hardcoding one-off booleans like:
- `canEditBlog`
- `isReadonly`
- `isAdmin`

The system should support:
- signed-in users with different access levels per module
- backend enforcement, not only UI hiding
- capability-based checks in code
- extension to future modules such as `blog`, `news`, or `media`
- coexistence with the current modular-monolith structure

`module-lab` is the first implementation target because it already exercises:
- public module page
- authenticated module controls
- Next proxy route
- Fastify backend route
- queue/job path

## Current architecture assumptions

This plan is based on the repo as it exists now:
- modules are declared through manifests in `src/shared/modules/module-manifest.ts`
- frontend module composition flows through `src/modules/registry.ts`
- backend module composition flows through `api/modules/registry.mjs`
- `module-lab` is a dual-surface module:
  - public page at `/[locale]/module-lab`
  - authenticated controls on the same page
- module-enabled state is controlled by `ENABLED_MODULES`
- Playwright suites now set module combinations explicitly through `--enabled-modules=...`

This means RBAC should plug into the current module system, not introduce a parallel feature model.

## Recommended model

Use **module-scoped roles** for assignment and **capabilities** for enforcement.

### Why this model

Roles are useful for humans:
- `viewer`
- `author`
- `editor`
- `operator`

Capabilities are useful for code:
- `module-lab.read`
- `module-lab.run_job`
- `blog.read`
- `blog.subscribe`
- `blog.post.create`

Code should mostly check capabilities, not role names.

## First-scope design

### Module roles

For `module-lab`, start with:
- `viewer`
- `operator`

Meaning:
- `viewer`
  - can access public page as an anonymous or signed-in user
  - can access authenticated read status if required
- `operator`
  - can do everything `viewer` can
  - can trigger the diagnostic module job

This is intentionally small. It proves the pattern without inventing fake complexity.

### Module capabilities

For `module-lab`, start with:
- `module-lab.read`
- `module-lab.run_job`

Role mapping:
- `viewer`
  - `module-lab.read`
- `operator`
  - `module-lab.read`
  - `module-lab.run_job`

## Authorization principles

### 1. Public page access is separate from module capabilities

The public route `/[locale]/module-lab` should remain public and SEO-visible.

That route should not require a module role just to render public content.

Module RBAC applies to:
- authenticated controls
- module backend routes
- mutation actions
- job-triggering actions

### 2. UI hiding is not enough

If a user lacks `module-lab.run_job`:
- the button should not appear or should be disabled in the UI
- the Next proxy route must still reject the request
- the Fastify backend must still reject the request

### 3. Capabilities are resolved server-side

Do not rely on client-side role logic as the source of truth.

The server should resolve:
- who the user is
- what module role they have
- what capabilities that role grants

Then:
- pass allowed capabilities into the UI
- enforce again in Next/Fastify handlers

### 4. Queue authorization happens before enqueue

Workers should assume queued jobs are already authorized.

The important check is before:
- `request.server.services.enqueueModuleJob(...)`

That means `module-lab.run_job` must be enforced:
- in the Next proxy route
- and again in Fastify before the enqueue call

## Data model

### First table

The current first-pass implementation uses:
- `public.user_module_roles`

with uniqueness on:
- `(user_id, module_id)`

This is acceptable as an initial proving step for `module-lab`, but it should now be treated as **transitional**, not the final target architecture.

Why:
- `workspace` is a core domain concept in this repo
- future modules will likely need different access levels per workspace
- the same user may need different roles in different workspaces

### Transitional first iteration

Add a table like:
- `public.user_module_roles`

Suggested columns:
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `module_id text not null`
- `role text not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Recommended uniqueness:
- unique `(user_id, module_id)`

Why this is enough now:
- one role per user per module is simple
- it covers the immediate need
- it proves the RBAC pattern before workspace-scoped memberships are introduced

### Target architecture: workspace-scoped RBAC

The target direction should be:
- `workspace` is a first-class core entity
- module access is resolved within a workspace context
- every user automatically gets one personal workspace
- shared/team workspaces can coexist with personal workspaces

That means the long-term shape should move toward:
- `user_id + workspace_id + module_id -> role`

Possible target tables:
- `public.workspaces`
- `public.workspace_memberships`
- `public.workspace_module_roles`

Recommended conceptual split:

1. Workspace membership
- who belongs to a workspace at all
- examples:
  - `owner`
  - `admin`
  - `member`

2. Module role within a workspace
- what the user can do inside a specific module for that workspace
- examples:
  - `blog.author`
  - `blog.editor`
  - `module-lab.operator`
  - `workspace-files.viewer`

This keeps core workspace membership separate from module-specific authorization.

This is the preferred direction for this repo:
- `workspace_memberships` grants baseline workspace access
- `workspace_module_roles` adds module-specific permissions on top

That means module access should not be treated as a substitute for workspace membership.
The intended evaluation order is:

1. confirm the user belongs to the workspace
2. then resolve module-specific role/capabilities inside that workspace

Baseline workspace rules:
- every workspace has exactly one `owner`
- ownership can be transferred to another user
- `admin` and `member` are non-owner membership roles

### Recommended target table shape

For module-scoped RBAC, the likely long-term table is:
- `public.workspace_module_roles`

Suggested columns:
- `id uuid primary key default gen_random_uuid()`
- `workspace_id uuid not null references public.workspaces(id) on delete cascade`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `module_id text not null`
- `role text not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Recommended uniqueness:
- unique `(workspace_id, user_id, module_id)`

Why this is the better target:
- same user can be `viewer` in one workspace and `operator` in another
- module access can match real team/workspace boundaries
- future modules like `blog` or `news` can live inside a workspace cleanly
- file access and module access can eventually share the same workspace identity

### Default module access inside a workspace

Not every module should require an explicit `workspace_module_roles` row for a workspace member.

The preferred model is:
- workspace membership grants baseline access to the workspace itself
- some modules can define a default member capability set
- `workspace_module_roles` adds extra capabilities on top of that baseline

This means:
- missing `workspace_module_roles` row does not always mean zero module access
- the default behavior is module-specific

Example:
- `workspace-files` may allow baseline read/upload access for a normal workspace member
- `blog` may allow `blog.read` by default, while `blog.post.publish` still requires a module role

### Capability resolution with workspace context

Once workspaces become first-class, capability resolution should become:

1. resolve current workspace
2. load workspace membership for `(workspace_id, user_id)`
3. deny if the user is not a workspace member
4. resolve default module capabilities for that membership role if the module provides them
5. load workspace module role for `(workspace_id, user_id, module_id)`
6. add module-specific capabilities on top of the baseline membership-derived capabilities

In code terms, the future helper shape becomes more like:

```ts
getUserModuleAccess(userId, workspaceId, moduleId)
```

Recommended return shape:

```ts
{
  workspaceId: string;
  membershipRole: "owner" | "admin" | "member" | null;
  moduleRole: string | null;
  capabilities: string[];
}
```

instead of:

```ts
getUserModuleAccess(userId, moduleId)
```

### Migration path from the current model

Recommended migration path:

1. Keep `user_module_roles` for the first implemented module
2. Introduce real `workspaces`
3. Automatically create one personal default workspace per user
4. Map the current `workspace_slug = "default"` behavior to that personal workspace
5. Add `workspace_memberships` for baseline workspace access
6. Add `workspace_module_roles` for module-specific authorization
7. Add workspace-aware authz helpers alongside the current ones
8. During migration, use dual-read helpers:
   - read workspace-scoped roles first when available
   - fall back to `user_module_roles` temporarily
9. Migrate current `user_module_roles` rows only into the user’s personal workspace
10. Make `workspace-files` the first real workspace-scoped module
11. Migrate other modules one by one to workspace-aware access checks
12. Retire `user_module_roles` once no module depends on the global form

This avoids rewriting the current implementation prematurely while still making the target architecture explicit.

### Future extension path

Later, if module authorization needs resource/workspace scope:
- introduce real workspace-scoped tables instead of mutating the first-pass table in place
- prefer a clean `workspace_module_roles` model over overloading the transitional `user_module_roles`

Do not rewrite the current implementation immediately unless a real module needs workspace-scoped authorization now.

The first recommended real migration target is:
- `workspace-files`

Why:
- it already has a workspace concept, even if currently simplified as `workspace_slug`
- it is the most natural bridge from the current model to real workspace-scoped access

## Core authorization layer

Create a core authorization area, for example:
- `src/core/authz/`
- `api/core/authz/`

First pieces:

1. Shared module capability types
- `src/shared/modules/module-capabilities.ts`

2. Shared role-to-capability mapping helpers
- `src/shared/modules/module-capabilities.ts`
- `src/shared/modules/module-capabilities.mjs`

3. Server-side resolution helpers
- `src/core/authz/module-access.ts`
- `api/core/authz/module-access.mjs`

## Shared types

Start with generic shared types like:

```ts
export type ModuleRoleAssignment = {
  moduleId: string;
  role: string;
};

export type ModuleCapability =
  | "module-lab.read"
  | "module-lab.run_job";
```

Do not try to make this universal for every future module immediately.

A practical evolution path:
- begin with a narrow union for implemented capabilities
- expand as real modules are added

## Role mapping

Create a central capability map, conceptually:

```ts
const moduleRoleCapabilities = {
  "module-lab": {
    viewer: ["module-lab.read"],
    operator: ["module-lab.read", "module-lab.run_job"],
  },
};
```

This should be:
- explicit
- easy to test
- shared between Next and Fastify so both layers enforce the same role map

The current repo uses:
- `src/shared/modules/module-capabilities.ts`
- `src/shared/modules/module-capabilities.mjs`

## Server-side resolution flow

### Next.js side

When rendering the authenticated controls for `module-lab`:
1. get current user
2. if signed out, render only the public module content
3. if signed in, read `user_module_roles` for `module-lab`
4. resolve capabilities
5. pass capabilities into the authenticated module card

The page should be able to decide:
- show the module status block
- show the run-job button
- or show a “signed in, but no operator access” message

### Next proxy route side

When handling:
- `GET /api/module-lab`
- `POST /api/module-lab`

do:
1. authenticate session
2. resolve module capabilities
3. reject if required capability is missing
4. then forward to Fastify

This gives faster failure and cleaner UI-facing errors.

### Fastify side

When handling:
- `GET /v1/module-lab`
- `POST /v1/module-lab/job`

do:
1. authenticate user
2. resolve module capabilities
3. reject if required capability is missing

Recommended behavior:
- `GET /v1/module-lab` requires `module-lab.read`
- `POST /v1/module-lab/job` requires `module-lab.run_job`

Return:
- `403` with a stable error code such as `module_capability_required`

## Suggested module-lab rollout

### Phase 1. DB and seed support

1. Add SQL for `user_module_roles`
2. Add notes in `docs/SQL`
3. Seed dedicated `module-lab` users during test setup:
   - one `operator`
   - one `viewer`
4. keep the ordinary signed-in user without a `module-lab` role to cover the no-role state

### Phase 2. Core authorization helpers

1. Add role -> capability map
2. Add helper:
   - `getUserModuleCapabilities(userId, moduleId)`
3. Add helper:
   - `hasModuleCapability(userId, moduleId, capability)`

### Phase 3. Enforce on backend

1. Protect `GET /v1/module-lab`
2. Protect `POST /v1/module-lab/job`
3. Return stable `403` responses

### Phase 4. Enforce in Next proxy routes

1. Protect `GET /api/module-lab`
2. Protect `POST /api/module-lab`
3. Return stable `403` responses before forwarding

### Phase 5. Reflect in UI

1. Pass module capabilities into `ModuleLabCard`
2. If no `module-lab.run_job`:
   - hide or disable the queue button
   - show a small access note

### Phase 6. Tests

Add coverage for:
- user with `operator` can queue job
- user with only `viewer` cannot queue job
- unauthenticated user still sees the public page
- signed-in unauthorized user sees no operator control
- Next proxy route rejects unauthorized mutation
- Fastify rejects unauthorized mutation even if called directly

## Test strategy in the current repo

Because module state is now explicit in test scripts, RBAC coverage should keep that same principle.

Recommended suite usage:
- `test:e2e:module-lab`
  - module enabled
  - public page
  - operator user
  - viewer user
  - signed-in no-role user
- `test:e2e:module-lab-disabled`
  - module disabled
  - public site should not show module entry

Do not rely on `.env.local` module state when validating RBAC behavior.

## How this extends to `blog`

Later, `blog` can reuse the same pattern:

Roles:
- `viewer`
- `author`
- `editor`

Capabilities:
- `blog.read`
- `blog.subscribe`
- `blog.post.create`
- `blog.post.update_own`
- `blog.post.update_any`
- `blog.post.delete_any`
- `blog.post.publish`

The same core authorization layer can resolve:
- workspace module role row
- capability list
- UI/server enforcement

That avoids inventing a new permission model per module.

## What not to do

Avoid:
- hardcoded booleans on the user model like `canEditBlog`
- relying only on client-side hiding
- global roles for everything
- overbuilding a generic policy engine before real use cases exist
- coupling RBAC to `ENABLED_MODULES` logic; these are separate concerns
- treating the transitional global `user_module_roles` model as the final architecture if workspaces are a core product concept

## Recommended file additions

### SQL
- `docs/SQL/user-module-roles.sql`

### Future SQL
- `docs/SQL/workspaces.sql`
- `docs/SQL/workspace-memberships.sql`
- `docs/SQL/workspace-module-roles.sql`

### Future migration docs
- `docs/SQL/migrate-default-workspace-slugs.sql`
- `docs/SQL/migrate-user-module-roles-to-workspace-module-roles.sql`

### Shared
- `src/shared/modules/module-capabilities.ts`

### Next/core
- `src/core/authz/module-access.ts`

### Fastify/core
- `api/core/authz/module-access.mjs`

### Tests
- extend `tests/utils/supabase-admin.ts`
- add API tests for `403` capability enforcement
- add Playwright coverage for signed-in unauthorized user

## Success criteria

The first iteration is successful when:
- `module-lab` public page remains public
- signed-in `operator` can queue the module job
- signed-in `viewer` cannot queue the module job
- Next proxy route returns `403` for unauthorized module actions
- Fastify returns `403` for unauthorized module actions
- UI reflects capability state cleanly
- the same pattern is ready to be reused by `blog`

The next architecture milestone after that is:
- module authorization becomes workspace-aware without changing the capability model itself
