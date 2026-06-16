# Workspace Access Administration Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add a workspace access administration surface where regular users can review/manage workspaces they belong to, manage workspace-scoped ModuleLab access rights, and where an explicitly configured manual-testing admin account can adjust workspace membership and module roles across users.

**Architecture:** Build on the existing workspace model and member-management APIs instead of creating a separate authorization model. The normal product flow remains workspace-owner scoped. A narrowly scoped, env-gated test-admin capability adds manual-testing powers without making every owner path depend on super-admin logic.

**Tech Stack:** Next.js App Router, Mantine UI, Fastify API, Supabase service-role backend services, Zod shared contracts, Playwright/API regression tests.

---

## Current status

Status: **in progress**.

Completed baseline already in the repo:

- `workspaces`, `workspace_memberships`, and `workspace_module_roles` exist.
- `GET /api/workspaces` / `GET /v1/workspaces` list workspaces where the signed-in user has a membership.
- `WorkspaceShellProvider` already keeps the current workspace and `bbb` query selection in sync.
- `WorkspaceMembersCard` already lists/adds/updates/removes members and transfers ownership for the currently selected shared workspace.
- Backend member-management routes already enforce owner-only mutations for shared workspaces.
- ModuleLab runtime checks already support workspace-scoped access when a `bbb`/`workspaceId` is supplied.
- Task 5 is complete: the personal workspace page now shows a first-10 workspace access overview with row links that preserve `bbb`.
- Task 8 is complete: `WORKSPACE_RBAC_STRICT` / `workspaceRbacStrict` runtime support was removed, ModuleLab API requests now always require workspace context, and shared workspaces now expose ModuleLab access management backed by `workspace_module_roles`.
- Task 9 is complete: authenticated app ModuleLab links preserve `bbb=<currentWorkspaceId>` while public/marketing ModuleLab links remain bare.
- Task 1 is complete: app-admin email allowlist parsing/checking now has shared helper coverage and runs in `test:api:all`.
- Task 2 is complete: app-admin Supabase service methods can list workspaces/members and update existing non-owner workspace roles plus ModuleLab access rows.
- Task 3 is complete: Fastify `/v1/admin/workspaces...` routes are guarded by the app-admin email allowlist and call the explicit app-admin service methods.
- Task 4 is complete: Next `/api/admin/workspaces...` proxy routes mirror the Fastify app-admin API and preserve upstream app-admin denial/error payloads.
- Task 6 is complete: the personal workspace overview now shows app-admin-only testing tools for global workspace/member inspection, member role edits, and ModuleLab access edits.
- Task 7 is complete: `docs/admin-testing.md` documents `APP_ADMIN_EMAILS` setup and safety notes; no `.env.example` exists in this repo.
- Task 10 is complete: browser coverage now verifies normal workspace overview, app-admin tools, ModuleLab access changes/restriction, and workspace-aware ModuleLab navigation.

Still pending for this feature:

- No tasks remain for the current app-admin workspace access plan.

Next recommended step:

- Move this plan to `docs/plans/done` after the final verification/commit pass.

## Recommended approach

### 1. Keep normal workspace administration membership-scoped

For normal users, use the existing model:

- `owner`: can manage members, transfer ownership, and manage ModuleLab access in shared workspaces.
- `admin`: can access the workspace, see details, and manage ModuleLab access.
- `member`: can access workspace details in read-only mode.

This avoids introducing global admin behavior into the normal product path.

### 2. Add a personal-workspace "Workspace access" overview card

When the current selected workspace is personal, show a card/table on `/[locale]/workspace`:

Columns:

- workspace name
- kind (`personal` / `shared`)
- current user's role (`owner` / `admin` / `member`)
- action link

Behavior:

- Display only the first 10 workspaces returned by `/api/workspaces`.
- The row link should preserve the current route and set `bbb=<workspaceId>`:
  - preferred first pass: `/${locale}/workspace?bbb=<workspaceId>`
- For `owner` rows, the destination shows the existing member-management card with actions.
- For `admin`/`member` rows, the destination shows details and member list in read-only mode.

Do not create a separate route before it is needed. The current shell already supports selecting a workspace via `bbb`, and using it avoids duplicate workspace-detail state.

### 3. Add workspace-scoped ModuleLab access management

ModuleLab must be tied to the selected workspace.

Current bug to fix:

- authenticated app navigation can point to a bare `/<locale>/module-lab` URL
- that disconnects ModuleLab from the current workspace
- the page/API can only enforce the intended workspace access model when `bbb=<workspaceId>` is present
- runtime code still contains a `WORKSPACE_RBAC_STRICT=false` compatibility path, but the target model has no compatibility mode

Target behavior:

- authenticated app navigation links to `/<locale>/module-lab?bbb=<currentWorkspaceId>`
- public/marketing links may remain `/<locale>/module-lab`
- `WORKSPACE_RBAC_STRICT` is removed from config, services, routes, and tests
- missing workspace context is always rejected for authenticated ModuleLab API/status/job requests
- every workspace has its own ModuleLab access assignments in `workspace_module_roles`
- a workspace member with no explicit `module-lab` role row has no ModuleLab access
- valid ModuleLab access options are:
  - no access: no `workspace_module_roles` row
  - `viewer`: `module-lab.read`
  - `operator`: `module-lab.read` and `module-lab.run_job`

Normal workspace UI:

- show ModuleLab access beside the existing workspace member list for shared workspaces
- allow workspace `owner` and `admin` to set each non-owner member to no access, `viewer`, or `operator`
- allow `owner` and `admin` to set their own ModuleLab role too; workspace ownership remains governed by membership rules, not ModuleLab roles
- show read-only ModuleLab access state to plain `member` users
- when a member is removed from the workspace, their `module-lab` role row should be deleted or become unreachable through membership checks

API shape:

- add normal owner/admin-scoped module-role routes instead of overloading member-role routes:
  - `GET /v1/workspaces/:workspaceId/module-roles/module-lab`
  - `PATCH /v1/workspaces/:workspaceId/module-roles/module-lab/:userId`
  - `DELETE /v1/workspaces/:workspaceId/module-roles/module-lab/:userId`
- mirror those through Next proxy routes under `/api/workspaces/...`
- `PATCH` accepts only `viewer` or `operator`
- `DELETE` removes the row and means no ModuleLab access
- routes must verify the actor is a workspace `owner` or `admin`
- target user must be a current member of the workspace

Strict RBAC cleanup:

- remove `workspaceRbacStrict` from `api/config.mjs` and service construction
- remove `process.env.WORKSPACE_RBAC_STRICT` checks from Next proxy code
- remove `request.server.services.workspaceRbacStrict` branches from Fastify routes
- update tests so they assert unconditional workspace-required behavior instead of strict-mode behavior
- keep historical changelog entries as historical records, but do not add new docs that suggest the flag is still supported

### 4. Add optional manual-testing admin as an explicit app-admin capability

Requirement 2 is different from normal workspace ownership. A special admin account that can assign/change roles for arbitrary users is a super-admin/testing capability.

Recommended MVP:

- Add an env var allowlist:
  - `APP_ADMIN_EMAILS=admin@example.com,uu@uu.uu`
- Resolve app-admin status server-side only from the authenticated user's verified email.
- Keep this feature disabled by default when the env var is empty.
- Document it as a manual-testing/development tool, not as production RBAC.

Why env allowlist first:

- no new schema needed for MVP;
- easy to bootstrap on local/dev Supabase;
- avoids creating an admin role table before audit/security requirements are clear;
- keeps production deploys safe by leaving the env unset.

Future hardening, if this becomes product-grade:

- replace env allowlist with `app_admins` table;
- add audit log rows for every membership/module-role mutation;
- add confirmation modals and stronger CSRF/intent checks for destructive changes.

### 5. Add app-admin API surface separately from owner/admin workspace routes

Do **not** overload existing owner/admin-scoped endpoints too much. Add explicit internal API routes whose names make super-admin behavior obvious:

Fastify:

- `GET /v1/admin/workspaces?limit=10&query=...`
- `GET /v1/admin/workspaces/:workspaceId/members`
- `PATCH /v1/admin/workspaces/:workspaceId/members/:userId`
- `GET /v1/admin/workspaces/:workspaceId/module-roles/module-lab`
- `PATCH /v1/admin/workspaces/:workspaceId/module-roles/module-lab/:userId`
- `DELETE /v1/admin/workspaces/:workspaceId/module-roles/module-lab/:userId`
- optional later: `POST /v1/admin/workspaces/:workspaceId/members` by email

Next proxy:

- `GET /api/admin/workspaces`
- `GET /api/admin/workspaces/[workspaceId]/members`
- `PATCH /api/admin/workspaces/[workspaceId]/members/[userId]`
- `GET /api/admin/workspaces/[workspaceId]/module-roles/module-lab`
- `PATCH /api/admin/workspaces/[workspaceId]/module-roles/module-lab/[userId]`
- `DELETE /api/admin/workspaces/[workspaceId]/module-roles/module-lab/[userId]`

The handler should check `isAppAdmin(authenticatedUser.email)` before touching Supabase service methods. Return stable `403 app_admin_required` when denied.

For the first slice, support only membership role changes and ModuleLab role changes for existing workspace members. Adding arbitrary users can come after role editing is safe.

### 6. UI placement for the special admin account

Add an app-admin-only section to the same personal workspace overview card:

- If `currentWorkspace.kind === "personal"` and user is app admin:
  - show an "Admin testing tools" subsection;
  - list first 10 workspaces globally or provide a simple workspace id/email lookup;
  - link to an admin member-management and ModuleLab access view.

Keep visual copy explicit:

> Manual testing admin tools. This section is visible only to configured app-admin accounts.

Avoid hiding it under normal workspace ownership copy because its powers are broader.

## Implementation plan

### Task 1: Add app-admin helper and API contract tests

Status: **done**.

**Objective:** Define the app-admin allowlist behavior without touching UI.

**Files:**

- Create: `src/shared/admin/app-admin.mjs`
- Create: `api/tests/app-admin-access.test.mjs`
- Modify: `package.json`
- Modify: `scripts/run-api-tests.mjs`

**Tests first:**

- `isAppAdminEmail("admin@example.com", "admin@example.com") === true`
- trims and lowercases emails
- comma-separated allowlist works
- empty/missing allowlist denies all

**Verification:**

```bash
npm run test:api:app-admin-access
```

### Task 2: Add backend service methods for admin workspace inspection

Status: **done**.

**Objective:** Expose service-level read methods for app-admin workspace/member inspection.

**Files:**

- Modify: `api/services/supabase.mjs`
- Test: `api/tests/workspace-supabase-compat.test.mjs` or new `api/tests/admin-workspace-service.test.mjs`

**Methods:**

```js
listAdminWorkspaces({ limit = 10 })
listAdminWorkspaceMembers({ workspaceId })
updateAdminWorkspaceMemberRole({ workspaceId, targetUserId, role })
listAdminWorkspaceModuleRoles({ workspaceId, moduleId })
updateAdminWorkspaceModuleRole({ workspaceId, targetUserId, moduleId, role })
deleteAdminWorkspaceModuleRole({ workspaceId, targetUserId, moduleId })
```

**Rules:**

- `limit` defaults to 10 and clamps to a small max such as 50.
- Role update can only set `admin` or `member` in the first slice.
- Module role update can only set `module-lab` to `viewer` or `operator` in the first slice.
- Do not allow setting `owner` here; keep ownership transfer explicit and transactional.
- Do not delete memberships in this first admin slice.
- Deleting a ModuleLab role row is allowed and means no ModuleLab access.

**Verification:**

```bash
npm run test:api:admin-workspace-service
```

### Task 3: Add explicit Fastify app-admin routes

Status: **done**.

**Objective:** Add super-admin endpoints guarded by the app-admin email allowlist.

**Files:**

- Create: `api/routes/admin-workspaces.mjs`
- Modify: `api/app.mjs`
- Test: `api/tests/admin-workspace-routes.test.mjs`

**Routes:**

- `GET /v1/admin/workspaces`
- `GET /v1/admin/workspaces/:workspaceId/members`
- `PATCH /v1/admin/workspaces/:workspaceId/members/:userId`
- `GET /v1/admin/workspaces/:workspaceId/module-roles/module-lab`
- `PATCH /v1/admin/workspaces/:workspaceId/module-roles/module-lab/:userId`
- `DELETE /v1/admin/workspaces/:workspaceId/module-roles/module-lab/:userId`

**Expected behavior:**

- unauthenticated: `401 authorization_required`
- authenticated but not allowlisted: `403 app_admin_required`
- allowlisted: route delegates to service method

**Verification:**

```bash
npm run test:api:admin-workspace-routes
```

### Task 4: Add Next proxy routes for app-admin API

Status: **done**.

**Objective:** Make the admin APIs available to client components without exposing service-role keys.

**Files:**

- Create: `src/app/api/admin/workspaces/route-handlers.mjs`
- Create: `src/app/api/admin/workspaces/route.ts`
- Create: `src/app/api/admin/workspaces/[workspaceId]/members/route-handlers.mjs`
- Create: `src/app/api/admin/workspaces/[workspaceId]/members/route.ts`
- Create: `src/app/api/admin/workspaces/[workspaceId]/members/[userId]/route-handlers.mjs`
- Create: `src/app/api/admin/workspaces/[workspaceId]/members/[userId]/route.ts`
- Create: `src/app/api/admin/workspaces/[workspaceId]/module-roles/module-lab/route-handlers.mjs`
- Create: `src/app/api/admin/workspaces/[workspaceId]/module-roles/module-lab/route.ts`
- Create: `src/app/api/admin/workspaces/[workspaceId]/module-roles/module-lab/[userId]/route-handlers.mjs`
- Create: `src/app/api/admin/workspaces/[workspaceId]/module-roles/module-lab/[userId]/route.ts`
- Test: `api/tests/next-admin-workspace-routes.test.mjs`

**Verification:**

```bash
npm run test:api:next-proxy:admin-workspaces
```

### Task 5: Add personal-workspace overview card for the signed-in user's first 10 workspaces

Status: **done**.

**Objective:** Add the normal-user workspace overview requested in item 1.

**Files:**

- Create: `src/modules/workspaces/components/workspace-access-overview-card.tsx`
- Modify: `src/app/[locale]/(app)/workspace/page.tsx`
- Modify: `src/lib/i18n/dictionaries.ts`
- Test: e2e or component-level source/API tests depending on existing test style

**Behavior:**

- Render only when current workspace is personal.
- Use `useWorkspaceShellContext().workspaces`.
- Show first 10 workspaces in a table.
- Each row links to `/${locale}/workspace?bbb=<workspace.id>`.
- Badges show role and kind.
- Empty state says the personal workspace is the only workspace so far.

**Verification:**

```bash
npm run lint
npm run typecheck
npm run test:e2e:auth
```

### Task 6: Add admin-only testing tools UI

Status: **done**.

**Objective:** Give the configured admin account a UI to inspect/change roles for manual testing.

**Files:**

- Create: `src/modules/workspaces/components/admin-workspace-access-card.tsx`
- Modify: `src/modules/workspaces/components/workspace-access-overview-card.tsx`
- Modify: `src/lib/i18n/dictionaries.ts`

**Behavior:**

- Detect admin status from a server-provided boolean, not from client-side env directly.
- Show only on the personal workspace page.
- List first 10 admin-visible workspaces from `/api/admin/workspaces`.
- Link/select a workspace to load members from `/api/admin/workspaces/:workspaceId/members`.
- Load ModuleLab roles from `/api/admin/workspaces/:workspaceId/module-roles/module-lab`.
- Allow changing non-owner member roles between `admin` and `member`.
- Allow changing ModuleLab access for current workspace members between no access, `viewer`, and `operator`.
- Keep owner changes out of this UI for the first slice.

**Verification:**

```bash
npm run test:e2e:auth
npm run lint
npm run typecheck
```

### Task 7: Add manual-testing admin seed/setup documentation

Status: **done**.

**Objective:** Make the special admin account reproducible without hardcoding secrets into the app.

**Files:**

- Create: `docs/admin-testing.md`
- Optional create: `scripts/ensure-admin-test-user.mjs`
- Modify: `.env.example` if present

**Recommended documentation:**

```env
APP_ADMIN_EMAILS=admin@example.com
```

Optional script behavior:

- use `SUPABASE_SERVICE_ROLE_KEY` locally;
- create/confirm a test admin user if missing;
- never print passwords or service-role keys;
- optionally create several test users/workspaces/memberships for QA.

**Verification:**

```bash
npm run lint
npm run typecheck
```

### Task 8: Remove `WORKSPACE_RBAC_STRICT` compatibility and add normal workspace ModuleLab access APIs/UI

Status: **done**.

**Objective:** Make workspace RBAC unconditional and let workspace owners/admins manage ModuleLab access inside the selected workspace.

**Files:**

- Modify: `src/shared/api/workspaces.mjs`
- Modify: `api/services/supabase.mjs`
- Modify: `api/routes/workspaces.mjs`
- Modify: `api/config.mjs`
- Modify: `api/modules/module-lab/routes/module-lab.mjs`
- Modify: `src/app/api/module-lab/route-handlers.mjs`
- Create: Next proxy routes under `src/app/api/workspaces/[workspaceId]/module-roles/module-lab/...`
- Create: `src/modules/workspaces/components/workspace-module-lab-access-card.tsx`
- Modify: `src/app/[locale]/(app)/workspace/page.tsx`
- Modify: `src/lib/i18n/dictionaries.ts`

**Behavior:**

- Remove `WORKSPACE_RBAC_STRICT` and `workspaceRbacStrict`; there is no env opt-out.
- ModuleLab authenticated API/status/job requests without workspace context always return `workspace_required`.
- Render on selected shared workspaces.
- Load workspace members and their `module-lab` role rows.
- Show ModuleLab access as no access, `viewer`, or `operator`.
- Allow workspace `owner` and `admin` to update/remove ModuleLab access.
- Plain `member` users see a read-only ModuleLab access state.
- Target users must already be members of the workspace.

**Verification:**

```bash
npm run test:api:workspace-rbac
npm run test:api:modules
npm run test:api:next-proxy:module-lab
npm run test:api:all
npm run typecheck
```

### Task 9: Make authenticated ModuleLab links workspace-aware

Status: **done**.

**Objective:** Ensure app navigation and workspace entry points link to the ModuleLab instance for the current workspace.

**Files:**

- Modify: app navigation/module navigation helpers as needed
- Modify: `src/modules/module-lab/manifest.ts` only if the manifest needs an app-link resolver
- Test: browser/source test for app ModuleLab href generation

**Behavior:**

- Authenticated app navigation uses `/${locale}/module-lab?bbb=<currentWorkspaceId>`.
- Marketing/public navigation remains `/${locale}/module-lab`.
- ModuleLab card/API calls keep forwarding `bbb` to `/api/module-lab`.

**Verification:**

```bash
npm run test:e2e:module-lab
npm run test:e2e:combined
npm run lint
npm run typecheck
```

### Task 10: Add browser regression coverage

Status: **done**.

**Objective:** Prove the normal and app-admin flows work end-to-end.

**Files:**

- Create: `tests/auth/workspace-access-admin.spec.ts`
- Modify: `tests/utils/supabase-admin.ts` to seed admin and non-admin fixtures if needed

**Scenarios:**

1. Normal user on personal workspace sees first workspace-access table and row links.
2. Owner can open a shared workspace from the table and manage members with existing owner controls.
3. Non-admin does not see manual-testing admin tools.
4. Configured app-admin sees admin tools and can change a member role for a seeded workspace.
5. Owner/admin can change a member's ModuleLab access from no access to `viewer` and `operator`.
6. A member with no ModuleLab role sees the restricted ModuleLab state for that workspace.
7. App ModuleLab navigation preserves `bbb=<workspaceId>`.

**Verification:**

```bash
npm run test:e2e:auth
npm run test:api:all
npm run lint
npm run typecheck
```

## Security notes

- Do not expose Supabase service-role operations to client code.
- Treat the special admin account as a dev/manual-testing feature until audit logging exists.
- Keep admin capability server-side and explicit (`APP_ADMIN_EMAILS` or later `app_admins` table).
- Do not allow arbitrary ownership changes through the first app-admin UI; use existing owner transfer RPC or a separately reviewed admin transfer endpoint later.
- Do not grant ModuleLab access from workspace membership alone; `workspace_module_roles` is the explicit access source for ModuleLab.
- Keep route names explicit (`/admin/...`) so code review can distinguish normal owner-scoped behavior from test-admin behavior.

## Recommended first milestone

Implement Tasks 8 and 9 first to fix the current ModuleLab workspace disconnect for normal users.

Then implement Tasks 1, 3, 4, and 5, but keep app-admin mutations read-only until the UI and tests are reviewed. Add app-admin ModuleLab role mutation as the second admin milestone.
