# Changelog

## App-admin allowlist foundation

- Added a shared app-admin email allowlist helper for future manual-testing admin routes.
- Added focused API coverage for trimming, lowercasing, comma-separated allowlists, and empty allowlist denial.
- Included the app-admin allowlist regression in `test:api:all`.

## Workspace access overview

- Added a personal-workspace access overview listing the first workspaces the signed-in user belongs to.
- Workspace overview rows link back to `/workspace` with `bbb=<workspaceId>` so users can jump into shared workspace contexts.

## ModuleLab workspace access management

- Removed the `WORKSPACE_RBAC_STRICT` runtime opt-out; workspace RBAC now behaves as always strict.
- ModuleLab authenticated API/status/job requests now always require explicit workspace context.
- Removed default ModuleLab read access from workspace membership; ModuleLab access now comes from explicit `workspace_module_roles` rows.
- Added owner/admin workspace UI and API routes for setting ModuleLab access to no access, viewer, or operator.
- Authenticated app ModuleLab links now preserve the selected workspace with `bbb=<workspaceId>`.

## Local production fonts

- Replaced `next/font/google` with local `@fontsource-variable` Manrope and Space Grotesk packages so production builds no longer depend on fetching Google Fonts.
- Added auth-callback redirect coverage to `test:api:all` so `NEXT_PUBLIC_SITE_URL` origins such as `http://deb4:3001` stay protected from localhost regressions.

## Workspace storage timeout resilience

- Added bounded S3 request timeouts so workspace file uploads fail quickly instead of hanging on stalled storage calls.
- Classified storage request timeouts as `workspace_storage_unreachable` and retried transient upload failures in integration tests and the workspace file UI.
- Removed brittle `networkidle` waits from protected-route redirect e2e tests.

## Sign-out redirect site URL

- Fixed `/auth/sign-out` to build its post-logout redirect from `NEXT_PUBLIC_SITE_URL` when configured.
- Added shared redirect URL coverage for configured site URL, locale preservation, and request-origin fallback.
- Included the sign-out redirect regression in `test:api:all`.

## Workspace module-role service coverage

- Added Supabase service coverage for `getUserWorkspaceModuleRole` querying by `(workspace_id, user_id, module_id)`.
- Added coverage for the no-role path returning `null` without falling back to legacy global roles.
- Marked the workspace-scoped RBAC migration cleanup plan as complete.

## Workspace file data compatibility fallback removal

- Removed the Supabase service helper that retried workspace-file queries/inserts without `workspace_id`.
- Workspace-file list/create/delete paths now use `workspace_id` directly for data access.
- Updated Supabase service coverage to assert direct `workspace_id` reads/writes instead of legacy fallback behavior.

## Workspace RBAC strict default

- Made workspace RBAC strict behavior the default; `WORKSPACE_RBAC_STRICT=false` is now the explicit opt-out.
- Removed remaining legacy compatibility capability fallback from backend/frontend authz helpers.
- Removed the unused legacy compatibility capability resolver.
- Updated module-lab Next proxy tests to use explicit workspace context by default.

## Legacy user module-role runtime retirement

- Removed active runtime and fixture reads/writes of `user_module_roles`; module-lab tests now use workspace-scoped module roles.
- Deleted legacy SQL helper files that recreated or assigned global module roles.
- Added regression coverage that runtime authz/service/fixture files do not query `user_module_roles`.

## Legacy user module-role SQL retirement

- Removed `user_module_roles` creation from the fresh Supabase bootstrap SQL.
- Added `docs/SQL/retire-user-module-roles.sql` as the explicit post-migration drop step.
- Added SQL regression coverage and included it in `test:api:all`.

## Frontend strict RBAC missing-table fallback

- Fixed frontend/server workspace RBAC helper so strict mode does not grant legacy compatibility capabilities when workspace tables are missing.
- Added a source regression guard and included it in `test:api:all`.

## Strict module-lab workspace requirement

- In strict workspace RBAC mode, module-lab backend and Next proxy routes now require an explicit workspace context instead of using global module-role fallback.
- Added backend and Next proxy tests for strict module-lab requests with and without workspace context.

## Workspace ownership RPC applied

- Recorded that the new `transfer_workspace_ownership` RPC SQL has been applied to the target Supabase database(s).
- Updated the workspace-scoped RBAC migration plan so the remaining work is focused on legacy `user_module_roles` retirement and compatibility fallback cleanup.

## Workspace RBAC SQL bootstrap/reset coverage

- Added ownership-transfer RPC installation to `docs/SQL/bootstrap-supabase-initial.sql` for fresh Supabase projects.
- Added ownership-transfer RPC cleanup to `docs/SQL/reset-supabase-full.sql`.
- Added `test:api:sql-workspace-rbac` and included it in `test:api:all` so SQL bootstrap/reset drift is covered.

## Workspace module-role layering coverage

- Extended strict workspace RBAC tests to cover `workspace_module_roles` adding module capabilities on top of baseline workspace membership.
- Added coverage that strict workspace access keeps baseline membership capabilities when no workspace module role exists and does not read global module roles.

## Workspace-scoped RBAC migration slice

- Added strict workspace RBAC mode via `WORKSPACE_RBAC_STRICT=true`.
- Workspace file access now uses `workspace_id` as the access boundary when present, while legacy user-scoped fallback remains for migration compatibility.
- Updated default `workspace-files` capabilities so `member` can read/upload but cannot delete; `owner` and `admin` retain delete.
- Added transactional ownership-transfer SQL in `docs/SQL/transfer-workspace-ownership.sql` and strict-mode RPC wiring.
- Added strict RBAC, Supabase compatibility, and workspace-files integration regression coverage.

## Changelog process

- Added `docs/changelog-guidelines.md`, `docs/short-summary-changelog.md`, and `docs/problem-solution-changelog.md` as the active changelog system.
- Added a 20 KB changelog rotation rule: oversized changelogs move to `docs/old-changelogs/` before new entries are appended.
- Documented that successful plan steps should update changelogs and be committed when verification passes and no user question is pending.

## 04-14-1833

- Added the first workspace member-management backend slice:
  - list members
  - add member by email
  - update member role
  - remove member
  - transfer ownership
- Added shared workspace member-management API contracts.
- Added Fastify and Next proxy routes for workspace member operations.
- Added owner-only member-management UI on the workspace page.
- Added focused Next proxy tests for workspace members and member item routes.
