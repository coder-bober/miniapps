# Workspace Access Administration Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add a workspace access administration surface where regular users can review/manage workspaces they belong to, and where an explicitly configured manual-testing admin account can adjust workspace membership roles across users.

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

Still pending for this feature:

- Tasks 1-8 below have not been implemented yet.
- No `APP_ADMIN_EMAILS`, `/api/admin/workspaces`, `/v1/admin/workspaces`, or app-admin UI implementation exists yet.
- A personal-workspace overview table for the first 10 workspaces where the signed-in user is `owner`, `admin`, or `member`.
- A row-level link from that overview into the selected workspace details/management surface.
- A deliberate manual-testing admin model and seed/setup path.
- Backend/API permissions for the manual-testing admin to inspect/change roles without being the workspace owner.
- UI affordances for the manual-testing admin that do not leak into normal users' owner-scoped flow.

Next recommended step:

- Start at Task 1 to add the app-admin helper and tests before adding routes or UI.

## Recommended approach

### 1. Keep normal workspace administration membership-scoped

For normal users, use the existing model:

- `owner`: can manage members and transfer ownership in shared workspaces.
- `admin`: can access the workspace and see details; do not grant member-management mutations yet unless a future requirement says so.
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

### 3. Add optional manual-testing admin as an explicit app-admin capability

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

### 4. Add app-admin API surface separately from owner member-management routes

Do **not** overload existing owner-scoped endpoints too much. Add explicit internal API routes whose names make super-admin behavior obvious:

Fastify:

- `GET /v1/admin/workspaces?limit=10&query=...`
- `GET /v1/admin/workspaces/:workspaceId/members`
- `PATCH /v1/admin/workspaces/:workspaceId/members/:userId`
- optional later: `POST /v1/admin/workspaces/:workspaceId/members` by email

Next proxy:

- `GET /api/admin/workspaces`
- `GET /api/admin/workspaces/[workspaceId]/members`
- `PATCH /api/admin/workspaces/[workspaceId]/members/[userId]`

The handler should check `isAppAdmin(authenticatedUser.email)` before touching Supabase service methods. Return stable `403 app_admin_required` when denied.

For the first slice, support only role changes for existing workspace members. Adding arbitrary users can come after role editing is safe.

### 5. UI placement for the special admin account

Add an app-admin-only section to the same personal workspace overview card:

- If `currentWorkspace.kind === "personal"` and user is app admin:
  - show an "Admin testing tools" subsection;
  - list first 10 workspaces globally or provide a simple workspace id/email lookup;
  - link to an admin member-management view.

Keep visual copy explicit:

> Manual testing admin tools. This section is visible only to configured app-admin accounts.

Avoid hiding it under normal workspace ownership copy because its powers are broader.

## Implementation plan

### Task 1: Add app-admin helper and API contract tests

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

**Objective:** Expose service-level read methods for app-admin workspace/member inspection.

**Files:**

- Modify: `api/services/supabase.mjs`
- Test: `api/tests/workspace-supabase-compat.test.mjs` or new `api/tests/admin-workspace-service.test.mjs`

**Methods:**

```js
listAdminWorkspaces({ limit = 10 })
listAdminWorkspaceMembers({ workspaceId })
updateAdminWorkspaceMemberRole({ workspaceId, targetUserId, role })
```

**Rules:**

- `limit` defaults to 10 and clamps to a small max such as 50.
- Role update can only set `admin` or `member` in the first slice.
- Do not allow setting `owner` here; keep ownership transfer explicit and transactional.
- Do not delete memberships in this first admin slice.

**Verification:**

```bash
npm run test:api:admin-workspace-service
```

### Task 3: Add explicit Fastify app-admin routes

**Objective:** Add super-admin endpoints guarded by the app-admin email allowlist.

**Files:**

- Create: `api/routes/admin-workspaces.mjs`
- Modify: `api/app.mjs`
- Test: `api/tests/admin-workspace-routes.test.mjs`

**Routes:**

- `GET /v1/admin/workspaces`
- `GET /v1/admin/workspaces/:workspaceId/members`
- `PATCH /v1/admin/workspaces/:workspaceId/members/:userId`

**Expected behavior:**

- unauthenticated: `401 authorization_required`
- authenticated but not allowlisted: `403 app_admin_required`
- allowlisted: route delegates to service method

**Verification:**

```bash
npm run test:api:admin-workspace-routes
```

### Task 4: Add Next proxy routes for app-admin API

**Objective:** Make the admin APIs available to client components without exposing service-role keys.

**Files:**

- Create: `src/app/api/admin/workspaces/route-handlers.mjs`
- Create: `src/app/api/admin/workspaces/route.ts`
- Create: `src/app/api/admin/workspaces/[workspaceId]/members/route-handlers.mjs`
- Create: `src/app/api/admin/workspaces/[workspaceId]/members/route.ts`
- Create: `src/app/api/admin/workspaces/[workspaceId]/members/[userId]/route-handlers.mjs`
- Create: `src/app/api/admin/workspaces/[workspaceId]/members/[userId]/route.ts`
- Test: `api/tests/next-admin-workspace-routes.test.mjs`

**Verification:**

```bash
npm run test:api:next-proxy:admin-workspaces
```

### Task 5: Add personal-workspace overview card for the signed-in user's first 10 workspaces

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
- Allow changing non-owner member roles between `admin` and `member`.
- Keep owner changes out of this UI for the first slice.

**Verification:**

```bash
npm run test:e2e:auth
npm run lint
npm run typecheck
```

### Task 7: Add manual-testing admin seed/setup documentation

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

### Task 8: Add browser regression coverage

**Objective:** Prove the normal and app-admin flows work end-to-end.

**Files:**

- Create: `tests/auth/workspace-access-admin.spec.ts`
- Modify: `tests/utils/supabase-admin.ts` to seed admin and non-admin fixtures if needed

**Scenarios:**

1. Normal user on personal workspace sees first workspace-access table and row links.
2. Owner can open a shared workspace from the table and manage members with existing owner controls.
3. Non-admin does not see manual-testing admin tools.
4. Configured app-admin sees admin tools and can change a member role for a seeded workspace.

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
- Keep route names explicit (`/admin/...`) so code review can distinguish normal owner-scoped behavior from test-admin behavior.

## Recommended first milestone

Implement Tasks 1, 3, 4, and 5 first, but keep admin mutations read-only until the UI and tests are reviewed.

Then implement role-change mutation as a second small milestone. This reduces risk because the normal personal-workspace overview can ship independently from super-admin mutation powers.
