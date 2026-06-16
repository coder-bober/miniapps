# Workspaces SQL Notes

## Purpose

The `workspaces` table is the first core step toward:
- personal workspaces for every user
- shared/team workspaces
- workspace-scoped RBAC for modules

## Workspace kinds

Current intended kinds:
- `personal`
- `shared`

`personal` workspaces:
- belong to exactly one user
- are the home for the current `workspace_slug = 'default'` behavior
- should be created automatically for every user

`shared` workspaces:
- support team access later
- do not use `personal_owner_user_id`
- may optionally be marked public for public module surfaces

## Public workspace flag

`is_public` controls whether a workspace may affect anonymous/public module pages.

Rules:
- `is_public = false`
  - workspace is still usable for authenticated members
  - public routes must ignore it
- `is_public = true`
  - public module pages may resolve workspace-scoped public content from it

This flag is about public content visibility, not membership or RBAC.

## Personal workspace slug strategy

The migration SQL uses:
- `user-<user_id_without_dashes>`

Why:
- deterministic
- unique
- easy to backfill
- avoids guessing from mutable profile fields such as username

This can later be hidden behind friendlier display names in the UI.

## Ownership model

Personal workspaces:
- have exactly one owner
- that owner is the `personal_owner_user_id`

Shared workspaces:
- should still have exactly one owner membership
- but should not use `personal_owner_user_id`

## RLS direction

The first policy shape is intentionally narrow:
- a user can view workspaces they belong to

More complex mutations should come later through backend-owned flows.
