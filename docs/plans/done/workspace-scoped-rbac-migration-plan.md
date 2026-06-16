# Workspace-Scoped RBAC Migration Plan

## Current status

Status: **done**.

Completed:

- Core workspace tables and SQL docs exist for `workspaces`, `workspace_memberships`, and `workspace_module_roles`.
- Personal/default workspace migration docs exist, including mapping the old `workspace_slug = "default"` behavior to a personal workspace.
- Shared workspace creation, workspace listing, member listing, member mutation, and ownership transfer endpoints exist.
- Workspace shell context exists and passes the selected workspace into modules.
- Workspace-aware module access helpers exist on both sides:
  - `src/core/authz/module-access.ts` exposes `getCurrentUserWorkspaceModuleAccess`.
  - `api/core/authz/module-access.mjs` exposes `getUserWorkspaceModuleAccess`.
- `workspace-files` and `module-lab` consume workspace context/access in the current app.
- Workspace RBAC strict behavior is now the required model; remaining source mentions of `WORKSPACE_RBAC_STRICT` / `workspaceRbacStrict` are cleanup targets tracked by the active workspace access administration plan.
- Frontend/server and backend authz helpers no longer grant legacy compatibility capabilities.
- Fresh-project bootstrap SQL no longer creates the legacy `user_module_roles` table, active runtime/fixture paths no longer query it, and `docs/SQL/retire-user-module-roles.sql` documents the explicit drop step for migrated environments.
- `workspace-files` data access now uses `workspace_id` directly; the old retry helper for no-`workspace_id` workspace-file schemas has been removed.
- `workspace-files` default capabilities now distinguish roles: `owner`/`admin` can delete, `member` can read/upload only.
- Transactional ownership transfer SQL exists in `docs/SQL/transfer-workspace-ownership.sql`, strict backend transfer uses the `transfer_workspace_ownership` RPC, and the fresh-project bootstrap/reset SQL now installs/removes the RPC.
- The new ownership-transfer RPC SQL has been applied to the target Supabase database(s).
- Regression coverage includes strict RBAC behavior, workspace-owned file listing, member delete denial, owner delete success, SQL bootstrap/reset coverage for ownership-transfer RPC, workspace module-role capability layering, and direct `workspace_id` Supabase service access.

Still pending:

- None. The workspace-scoped RBAC migration cleanup plan is complete.

## Final target decisions

These decisions define the finish line for this plan.

1. **Workspace files are workspace-owned.** In a real workspace (`workspace_id` present), file list/read/delete authorization is based on membership in that workspace. The uploader `user_id` remains useful metadata and storage-key input, but must not be the access boundary for shared workspace files.
2. **Default `workspace-files` capabilities differ by membership role.** `owner` and `admin` get `read`, `upload`, and `delete`. Plain `member` gets `read` and `upload`, but not `delete`.
3. **Strict RBAC should be unconditional.** Runtime code must not silently fall back to `user_module_roles` or missing workspace tables, and there should be no env opt-out.
4. **Ownership transfer should move into a transactional database operation.** Keep the unique owner index, and add a Postgres/Supabase RPC for demoting the old owner and promoting the new owner in one operation.

## Clean finish implementation plan

1. Add strict-mode config plumbing and tests for strict vs compatibility behavior.
2. Update module capability defaults so `member` cannot delete workspace files.
3. Refactor workspace-file repository/service methods so `workspace_id` access is workspace-scoped; keep legacy `user_id + workspace_slug` only for compatibility paths.
4. Add route tests for shared workspace visibility, non-member denial, and member delete denial.
5. Add SQL/RPC plan or migration for transactional ownership transfer, then call it from the Supabase service.
6. Remove legacy compatibility fallback.
7. Remove active `user_module_roles` runtime fallback and keep migration/retirement docs only.

## Goal

Move from the current transitional module-role model:

- `user_module_roles`

to a workspace-aware authorization model based on:

- `workspaces`
- `workspace_memberships`
- `workspace_module_roles`

while keeping the current app working during migration.

This plan assumes:

- every user automatically gets one personal workspace
- shared/team workspaces can also exist
- the current `workspace_slug = "default"` should map to the user’s personal default workspace
- baseline workspace access comes from `workspace_memberships`
- module-specific access comes from `workspace_module_roles`
- some modules can grant default member capabilities without an explicit module-role row
- `workspace-files` is the first real module to migrate

## Core model

### 1. Workspaces

`workspaces` becomes a first-class core table.

Initial responsibilities:
- identify a workspace
- distinguish personal vs shared workspaces
- store ownership and naming metadata

Suggested initial columns:
- `id uuid primary key default gen_random_uuid()`
- `kind text not null`
  - `personal`
  - `shared`
- `slug text unique not null`
- `name text not null`
- `personal_owner_user_id uuid references auth.users(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Notes:
- a personal workspace should be owned by exactly one user
- a shared workspace may still have one owner membership, but not a `personal_owner_user_id`

### 2. Workspace memberships

`workspace_memberships` grants baseline access to the workspace itself.

Suggested columns:
- `id uuid primary key default gen_random_uuid()`
- `workspace_id uuid not null references public.workspaces(id) on delete cascade`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `role text not null`
  - `owner`
  - `admin`
  - `member`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Recommended constraints:
- unique `(workspace_id, user_id)`
- exactly one `owner` per workspace

Important rule:
- ownership can be transferred
- the system must enforce that a workspace always has exactly one owner

### 3. Workspace module roles

`workspace_module_roles` adds module-specific access on top of baseline membership.

Suggested columns:
- `id uuid primary key default gen_random_uuid()`
- `workspace_id uuid not null references public.workspaces(id) on delete cascade`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `module_id text not null`
- `role text not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Recommended constraints:
- unique `(workspace_id, user_id, module_id)`

## Authorization model

### Two-layer evaluation order

The intended evaluation order is:

1. resolve current workspace
2. load `workspace_memberships` for `(workspace_id, user_id)`
3. deny if the user is not a workspace member
4. resolve baseline module capabilities for that membership role if the module defines them
5. load `workspace_module_roles` for `(workspace_id, user_id, module_id)`
6. add module-specific capabilities on top of the baseline capability set

This means:
- module roles do not replace workspace membership
- module roles only add capabilities on top of baseline workspace access

### Future authz helper target

The target helper shape should become:

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

### Default member capability sets

Not every module should require an explicit `workspace_module_roles` row.

The model should support:
- module-specific default capability sets for workspace members
- extra capabilities added by module roles

Examples:
- `workspace-files`
  - default member capabilities might include read/upload/delete in their own workspace context
- `blog`
  - default member capabilities might include `blog.read`
  - author/editor/publisher actions still require module roles

## Migration strategy

### Phase 1. Add core workspace tables

Add SQL/docs for:
- `workspaces`
- `workspace_memberships`
- `workspace_module_roles`

Also define:
- owner uniqueness rules
- ownership transfer rules
- RLS strategy

Suggested docs:
- `docs/SQL/workspaces.sql`
- `docs/SQL/workspace-memberships.sql`
- `docs/SQL/workspace-module-roles.sql`

### Phase 2. Create personal workspaces for existing users

Every user should automatically get one personal workspace.

Migration behavior:
- create one personal workspace per existing user
- create one `workspace_memberships` row with role `owner`
- mark that workspace as the user’s personal default workspace

Suggested migration doc:
- `docs/SQL/migrate-personal-workspaces.sql`

### Phase 3. Map current `workspace_slug = "default"`

The current app behavior treats `workspace_slug = "default"` as a logical placeholder.

Migration target:
- `default` becomes the user’s personal workspace

Recommended application transition:
- keep `workspace_slug` temporarily for compatibility
- add real `workspace_id`
- resolve `"default"` to the user’s personal workspace in the compatibility layer

### Phase 4. Add dual-read authz helpers

Do not break current RBAC while introducing workspace-scoped access.

Add new workspace-aware helpers alongside the current ones:
- Next:
  - `getCurrentUserWorkspaceModuleAccess(userId, workspaceId, moduleId)`
- Fastify:
  - `getUserWorkspaceModuleAccess({ services, userId, workspaceId, moduleId })`

During migration these helpers should:

1. prefer workspace-scoped reads when the new tables are present
2. temporarily fall back to `user_module_roles` when needed

This preserves working behavior while modules migrate one by one.

### Phase 5. Migrate existing module-role data

Current `user_module_roles` rows should migrate only into the user’s personal workspace.

That means:
- do not copy global module roles into every workspace membership
- do not invent shared-workspace access during migration

Suggested migration doc:
- `docs/SQL/migrate-user-module-roles-to-workspace-module-roles.sql`

### Phase 6. Migrate `workspace-files` first

`workspace-files` should be the first real workspace-scoped module.

Why:
- it already has a workspace concept today
- it is currently using `workspace_slug`
- it is the cleanest bridge from the current simplified model to the real workspace model

Migration goals for `workspace-files`:
- add `workspace_id` to the file records
- keep temporary `workspace_slug` compatibility if needed
- resolve file access through:
  - workspace membership
  - workspace-files default member capabilities
  - optional `workspace_module_roles`

Recommended behavior for first pass:
- any workspace member can access the workspace files surface in their workspace
- explicit module roles can add stricter/future permissions later

### Phase 7. Retire global module roles

Once no module depends on `user_module_roles`:
- stop dual-read fallback
- remove old helper paths
- deprecate and later drop `user_module_roles`

Do not do this until:
- `workspace-files` is migrated
- the next real RBAC-enabled module also uses workspace-scoped roles

## Recommended implementation order

1. Add SQL plans for `workspaces`, `workspace_memberships`, and `workspace_module_roles`
2. Add docs for personal-workspace bootstrap and owner transfer rules
3. Add workspace-aware authz helper interfaces
4. Add dual-read compatibility helpers
5. Add `workspace_id` to workspace-file records and APIs
6. Migrate `workspace-files` to workspace-aware access checks
7. Add tests for personal workspace bootstrap and dual-read behavior
8. Migrate the next RBAC-enabled module
9. Retire `user_module_roles`

## Testing plan

### API tests

Add focused coverage for:
- user without workspace membership is denied
- workspace member with no module role still gets baseline module capabilities if the module allows them
- workspace module role adds capabilities on top of baseline membership
- dual-read fallback still works while legacy rows exist

### Browser tests

For `workspace-files`, add coverage for:
- personal default workspace behavior
- file access in the user’s own workspace
- no access when trying to reach a workspace without membership

### Migration tests

Where practical, add preflight checks that fail clearly if the new workspace tables are not present in environments that expect them.

## Operational considerations

### Personal workspace bootstrap

You will need a reliable rule for:
- new users
- existing migrated users

Recommendation:
- create the personal workspace during user bootstrap/profile creation
- backfill existing users with a dedicated migration script

### Ownership transfer

Because a workspace must have exactly one owner:
- ownership transfer should be explicit
- transfer should be transactional
- after transfer, the previous owner should become `admin` or `member` by policy

This should be designed before a shared-workspace UI exists.

### Shared workspaces

Do not block the migration on a full shared-workspace product.

The important early step is:
- make the schema and authz helpers workspace-aware now
- let shared-workspace management UX come later

## Success criteria

This migration is successful when:
- every user has one personal workspace
- `workspace_slug = "default"` is no longer the true source of identity
- `workspace-files` resolves access via workspace membership
- module-specific workspace roles can add capabilities on top
- dual-read compatibility keeps the current app working during transition
- the same model is ready for the next real workspace-aware module
