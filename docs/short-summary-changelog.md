# Changelog

## Shared Next proxy test setup

- Added shared Next proxy test dependency helpers for Supabase session and internal API stubs.
- Updated Next proxy specs to reuse the shared setup while keeping module access behavior local.

## Shared API test helpers

- Added shared API helpers for case execution and response JSON reading.
- Updated API tests to remove duplicated local helper definitions.

## Stable E2E selectors

- Added stable workspace/member/module access test ids for complex repeated workspace access UI.
- Updated workspace access admin browser coverage to avoid Mantine class selectors and broad row text filters.

## API route test organization

- Split the broad API route test bucket into account, workspace, workspace-file, and queue-service suites.
- Kept `test:api:routes` as the stable aggregate script through the test suite manifest.

## Shared E2E helpers

- Added shared browser-test helpers for module enablement checks and workspace/select controls.
- Updated workspace access, workspace files, and ModuleLab specs to use the shared helpers.

## E2E wait reliability

- Removed the remaining `networkidle` waits from E2E specs.
- Browser tests now wait for concrete URL, form, heading, alert, or module-state outcomes instead of global network quietness.

## Test suite manifest

- Added a shared test suite manifest as the source of truth for test commands, module flags, and aggregate suite ordering.
- Existing npm test script names now delegate to manifest suite ids.
- Aggregate test runners now share one runner implementation for command execution and duration summaries.

## Playwright warning cleanup

- Playwright runner sessions now avoid the noisy Node warning emitted when `NO_COLOR` and `FORCE_COLOR` are both present.
- The warning filter keeps an exact fallback suppression for that color-env warning in generated test logs.

## Workspace access admin browser coverage

- Added browser coverage for normal workspace overview behavior and hidden app-admin tools for non-admin users.
- Added browser coverage for app-admin member role changes, ModuleLab access changes, restricted ModuleLab state, and workspace-aware ModuleLab navigation.
- Added an e2e app-admin fixture and default Playwright `APP_ADMIN_EMAILS` value for test runs.

## App-admin workspace UI

- Added an app-admin-only section to the personal workspace access overview.
- The admin testing tools can load the first 10 global workspaces, inspect members, edit non-owner workspace roles, and manage ModuleLab access.
- Added `docs/admin-testing.md` with `APP_ADMIN_EMAILS` setup and safety notes.

## App-admin Next proxy routes

- Added `/api/admin/workspaces` Next proxy routes that mirror the Fastify app-admin API.
- Added shared admin workspace response validation for proxy success payloads.
- Added Next proxy coverage for session rejection, upstream app-admin denial, member updates, and ModuleLab role changes.

## App-admin Fastify routes

- Added `/v1/admin/workspaces` Fastify routes guarded by the `APP_ADMIN_EMAILS` allowlist.
- Added app-admin routes for listing workspaces/members, updating existing member roles, and managing ModuleLab access rows.
- Added route coverage for auth, app-admin denial, validation, service forwarding, and owner-protection errors.

## App-admin workspace service foundation

- Added app-admin Supabase service methods for listing workspaces and workspace members.
- Added app-admin service methods for changing existing non-owner workspace roles and managing ModuleLab access rows.
- Added focused service coverage and included it in `test:api:all`.

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
