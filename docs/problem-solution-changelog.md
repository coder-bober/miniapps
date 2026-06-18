# Important changes

## Stable workspace access selectors

Problem: workspace access browser coverage still relied on repeated row text filters and Mantine card class selectors for member and ModuleLab access controls. Those selectors were vulnerable to layout/component changes and repeated text collisions.

Solution: added stable `data-testid` hooks to workspace access rows, admin member rows/actions, and workspace ModuleLab access member cards/actions. The workspace access admin spec now targets workspace/user ids instead of styling classes or broad text filters.

## API route test split

Problem: one large API route test file mixed health, account, workspace, workspace-file, and queue-service coverage. The broad `test:api:routes` bucket made failures harder to triage and hid the actual domain affected by a test failure.

Solution: split the route bucket into domain-focused test files with shared route-test helpers. The stable `test:api:routes` script now runs the account, workspace, workspace-file, and queue-service suites through the test manifest.

## Shared E2E helper extraction

Problem: E2E specs duplicated module-flag parsing and workspace/select control helpers, with slightly different defaults for enabled modules. That made it easier for suites to drift when module combinations changed.

Solution: added shared E2E utilities for `ENABLED_MODULES` parsing and common select/workspace interactions, then updated workspace access, workspace files, and ModuleLab specs to use them. Focused auth and ModuleLab browser suites verify the refactor.

## E2E networkidle wait removal

Problem: several browser specs still used `page.waitForLoadState("networkidle")`, which can hang or add timing sensitivity when the app has background requests or long-lived browser activity. This conflicted with the project's established E2E guidance to wait for real redirect or UI outcomes.

Solution: replaced the remaining `networkidle` waits in E2E specs with targeted assertions for loaded form controls, headings, alerts, URLs, and module page state. Focused auth, ModuleLab, disabled-module, and homepage-error runs now cover the edited specs.

## Test suite manifest

Problem: test suite commands, module flags, production/dev mode, and aggregate ordering were spread across `package.json` and several runner scripts. Adding or changing a suite required coordinated edits in multiple places, which made drift likely.

Solution: added a shared test suite manifest plus a generic suite runner. Existing npm script names now delegate to manifest suite ids, while aggregate runners reuse the shared runner instead of carrying duplicate spawn and timing logic.

## Playwright color environment warning suppression

Problem: Playwright test sessions could print noisy Node warnings when both `NO_COLOR` and `FORCE_COLOR` were present. Setting `FORCE_COLOR=0` alone was not enough because Node still treats the variable as set and warns that `NO_COLOR` is ignored.

Solution: the Playwright runner now defaults `FORCE_COLOR=0`, the warning-filter environment helper removes `NO_COLOR` whenever `FORCE_COLOR` is present, and the Node warning filter suppresses the exact color-env warning as a fallback.

## Workspace access admin browser coverage

Problem: the workspace access admin plan had API and UI coverage but no browser-level proof that the normal and app-admin flows work together with seeded users. The e2e server also needed a reproducible app-admin email before tests start.

Solution: added a dedicated workspace access admin Playwright spec, seeded an app-admin fixture, and made Playwright default `APP_ADMIN_EMAILS` to that fixture email when not explicitly configured. The coverage exercises normal overview visibility, app-admin role edits, ModuleLab access changes, restricted ModuleLab access, and `bbb` preservation in ModuleLab app navigation.

## App-admin workspace UI

Problem: the app-admin API was available but there was no UI for a configured manual-testing admin to inspect or adjust workspace/member/ModuleLab access. The feature also needed setup guidance so enabling app-admin access did not depend on hidden local knowledge.

Solution: added an app-admin-only section to the personal workspace overview, with server-computed app-admin visibility and client-side controls for the first global workspace slice. Added `docs/admin-testing.md` documenting `APP_ADMIN_EMAILS`, manual setup, and safety boundaries.

## App-admin Next proxy routes

Problem: the Fastify app-admin API was not reachable through the App Router proxy layer used by frontend code. Calling the backend directly from client/UI code would bypass the existing session-to-bearer forwarding pattern and duplicate error handling.

Solution: added `/api/admin/workspaces...` proxy handlers and route wrappers that forward the current Supabase session token to the matching `/v1/admin/workspaces...` endpoints, validate success payloads, and preserve stable upstream app-admin denial/error responses.

## App-admin Fastify routes

Problem: the app-admin service methods were available internally but had no HTTP boundary that enforced the explicit manual-testing admin allowlist. Exposing the behavior through normal workspace routes would make broader admin powers hard to distinguish from owner/admin workspace permissions.

Solution: added dedicated `/v1/admin/workspaces...` Fastify routes that authenticate the request, require the signed-in email to match `APP_ADMIN_EMAILS`, and then call only the app-admin service methods. Route tests cover denial before service calls, request validation, owner-protection mapping, and ModuleLab role operations.

## App-admin workspace service foundation

Problem: app-admin API routes need backend operations that are clearly separate from owner-scoped workspace management. Reusing owner/admin methods would either require fake actor memberships or blur normal workspace permissions with the manual-testing admin model.

Solution: added explicit app-admin Supabase service methods for workspace inspection, member role changes, and ModuleLab role management. The first slice remains constrained to existing members, blocks owner role mutation, clamps workspace listing limits, and only allows `module-lab` viewer/operator role rows.

## App-admin allowlist foundation

Problem: the workspace access administration plan needs a manual-testing admin account, but no shared contract existed for how `APP_ADMIN_EMAILS` should be parsed or matched. Adding routes before defining that behavior would make route tests duplicate allowlist rules.

Solution: added a shared app-admin email helper that trims and lowercases comma-separated allowlist entries, denies missing or empty allowlists, and has focused API coverage included in `test:api:all`.

## ModuleLab disconnected from workspace access

Problem: ModuleLab could still be reached from authenticated app navigation without `bbb`, and workspace membership granted default ModuleLab read access. That made ModuleLab behave like one global diagnostics surface instead of a per-workspace module with explicit access rights.

Solution: removed the `WORKSPACE_RBAC_STRICT` opt-out path, made authenticated ModuleLab API requests always require workspace context, removed ModuleLab default membership capabilities, and added workspace owner/admin ModuleLab access management backed by `workspace_module_roles`. App navigation now preserves the current workspace in ModuleLab links.

## Production builds fetched Google Fonts

Problem: production e2e builds used `next/font/google` for Manrope and Space Grotesk, so an environment without reliable access to `fonts.googleapis.com` could fail before tests started. The `NEXT_PUBLIC_SITE_URL` auth-callback redirect behavior already had focused coverage, but that regression was not part of the standard API suite.

Solution: replaced the Google font loader with local `@fontsource-variable` packages and preserved the existing `--font-manrope` and `--font-space-grotesk` CSS variables. Added the auth-callback redirect regression to `test:api:all` so configured site origins such as `http://deb4:3001` remain covered.

## Workspace storage timeouts stalled test and upload flows

Problem: workspace file uploads used the default S3 client behavior, so a stalled storage request could hang integration tests or spend multiple SDK retry attempts before surfacing as a generic upload failure. Browser upload tests also treated a transient `workspace_storage_unreachable` response as final, and one redirect test still waited for `networkidle` around an auth redirect.

Solution: added explicit S3 connection/request timeouts with thrown timeout errors, disabled SDK-level multi-attempt retries, and classified timeout errors as `unreachable` so API responses stay consistent. Workspace upload integration and UI flows now retry the explicit transient storage-unreachable response, and protected-route tests wait for the real redirect URL instead of `networkidle`.

## Sign-out redirect used request origin instead of configured site URL

Problem: `/auth/sign-out` computed `NextResponse.redirect(new URL(`/${locale}`, request.url))`, so the redirect origin came from the request URL seen by the route. In the reported dev flow the app was opened as `deb5.local`, but the sign-out request/RSC redirect resolved to `localhost:3000`, producing a cross-origin RSC fetch and browser CORS error even though `.env.local` configured `NEXT_PUBLIC_SITE_URL=http://deb5.local:3000`.

Solution: extracted `createSignOutRedirectUrl` and changed the sign-out route to use it. The helper preserves the locale from the referer path, prefers `NEXT_PUBLIC_SITE_URL` when configured, and falls back to the request origin only when no site URL is set. Regression coverage now locks both the URL-construction behavior and the route's use of the shared helper.

## Workspace module-role service coverage

Problem: the plan's final remaining item called for more workspace-scoped module-role coverage beyond helper-level strict/default capability tests. The Supabase service method that reads `workspace_module_roles` was not directly locked down, so future edits could weaken the composite `(workspace_id, user_id, module_id)` lookup or accidentally revive broader role semantics.

Solution: added service-level coverage that `getUserWorkspaceModuleRole` reads `workspace_module_roles` by the full workspace/user/module identity and returns `null` when no scoped role row exists. With that final coverage in place, the workspace-scoped RBAC migration cleanup plan is marked complete.

## Workspace file data compatibility fallback removal

Problem: even after strict RBAC became the default, the Supabase workspace-file service still retried list/create/find/thumbnail queries with legacy `user_id + workspace_slug` shapes when `workspace_id` was missing. That could hide an incomplete migration and keep old access-boundary behavior alive.

Solution: removed the workspace-file compatibility retry helper and legacy no-`workspace_id` query/insert branches. Workspace-file data access now reads/writes `workspace_id` directly, and service tests assert the direct `workspace_id` query/insert shapes.

## Workspace RBAC strict default

Problem: workspace-scoped authorization was available, but strict behavior still had to be opted into and old compatibility-capability branches remained in authz helpers. That made it easy for new routes or tests to accidentally depend on migration behavior instead of the final workspace model.

Solution: made strict workspace RBAC the default with `WORKSPACE_RBAC_STRICT=false` as the explicit opt-out, removed the remaining legacy compatibility capability fallback from backend/frontend authz helpers, deleted the unused legacy compatibility capability resolver, and updated module-lab proxy coverage to use explicit workspace context by default.

## Legacy user module-role runtime retirement

Problem: after bootstrap stopped creating `user_module_roles`, active runtime and test-fixture paths could still read or seed the old global module-role table. That kept the transitional authorization model alive and could break fresh environments that only install `workspace_module_roles`.

Solution: removed runtime/service/fixture dependencies on `user_module_roles`, moved module-lab backend tests and auth fixtures onto workspace-scoped module roles, deleted legacy SQL helpers that recreated or assigned global module roles, and added a regression guard that checks runtime authz/service/fixture files do not query the legacy table.

## Legacy user module-role SQL retirement

Problem: even after runtime strict-mode paths moved toward workspace-scoped RBAC, the fresh-project bootstrap SQL still created the transitional `user_module_roles` table and trigger. New environments should start from the workspace-scoped model instead of recreating legacy schema.

Solution: removed `user_module_roles` table/trigger/function creation from `docs/SQL/bootstrap-supabase-initial.sql`, added `docs/SQL/retire-user-module-roles.sql` for migrated environments that need an explicit drop step, and added regression coverage so bootstrap does not reintroduce the legacy table.

## Frontend strict RBAC missing-table fallback

Problem: backend strict workspace RBAC already suppressed legacy compatibility capabilities, but the frontend/server helper still granted `resolveLegacyCompatibilityCapabilities(...)` if workspace tables were missing while `WORKSPACE_RBAC_STRICT=true`. That made strict behavior inconsistent between backend and frontend/server code.

Solution: changed the frontend/server helper's missing-workspace-table branches to return only the strict fallback capabilities in strict mode, and added a regression guard that checks these branches stay strict.

## Strict module-lab requests require workspace context

Problem: strict workspace RBAC suppressed legacy fallback inside workspace-aware helpers, but module-lab routes could still omit `workspaceId` and use the old global module-role helper. That kept an active runtime path dependent on `user_module_roles` even when strict mode was enabled.

Solution: module-lab backend and Next proxy routes now return `workspace_required` in strict mode when no workspace is selected, and they continue to use workspace membership plus `workspace_module_roles` when `workspaceId`/`bbb` is explicit. Regression tests cover both backend and Next proxy behavior.

## Workspace ownership RPC bootstrap/reset drift guard

Problem: the ownership-transfer RPC existed as standalone SQL and strict-mode code called it, but the fresh-project bootstrap SQL did not install it and the full reset SQL did not drop it. A new Supabase project bootstrapped from the all-in-one script could therefore miss the strict ownership-transfer function.

Solution: added `transfer_workspace_ownership` to `docs/SQL/bootstrap-supabase-initial.sql`, added the matching drop statement to `docs/SQL/reset-supabase-full.sql`, and added a SQL docs regression test that is now part of `test:api:all`.

## Workspace module-role layering test coverage

Problem: strict RBAC tests covered suppression of legacy/global fallback and workspace-files default capabilities, but did not directly lock down the intended `workspace_module_roles` layering model where module roles add capabilities on top of baseline workspace membership.

Solution: extended `api/tests/workspace-rbac-strict.test.mjs` to verify an explicit workspace module role adds `module-lab.run_job` while preserving baseline read access, and that strict mode keeps membership baseline capabilities without reading global module roles when no workspace module role exists.

## Workspace-scoped RBAC strict mode and shared file ownership

Problem: workspace-file authorization still mixed shared-workspace concepts with legacy user-scoped module access. Members inherited delete capability by default, shared files could still be treated as uploader-private in important data-access paths, and global/legacy module-role fallback made it difficult to verify the final workspace-scoped RBAC model.

Solution: added `WORKSPACE_RBAC_STRICT=true` handling, removed `workspace-files.delete` from the default `member` role, changed workspace-file list/find/delete paths to use `workspace_id` when present, and kept legacy user-scoped fallback only for compatibility paths. Focused strict RBAC and workspace-file tests now cover the target behavior.

## Transactional workspace ownership transfer

Problem: transferring workspace ownership requires demoting the current owner and promoting the new owner as one invariant-preserving operation. Doing this in application-level multi-step writes risks partial updates and makes exactly-one-owner behavior harder to guarantee.

Solution: added `docs/SQL/transfer-workspace-ownership.sql` with a `transfer_workspace_ownership` Postgres function and routed strict-mode ownership transfer through `adminClient.rpc("transfer_workspace_ownership", ...)`. The function locks the relevant membership rows, verifies actor/target constraints, demotes the actor to admin, and promotes the target to owner in one transaction.

## Changelog structure and rotation

Problem: a single changelog style is not ideal for both quick release-style scanning and implementation rationale. Long problem/solution changelogs can also grow quickly and become hard to edit or review.

Solution: added separate short-summary and problem-solution changelogs plus `docs/changelog-guidelines.md`. The guidelines define when to update each changelog and require rotation into `docs/old-changelogs/` whenever a changelog file exceeds 20 KB before appending new entries.
