# Workspace Memberships SQL Notes

## Purpose

`workspace_memberships` is the baseline access layer for workspaces.

It answers:
- does this user belong to this workspace?
- what is their workspace-wide role?

This is separate from module-specific authorization.

## Current roles

Baseline roles:
- `owner`
- `admin`
- `member`

Intended meaning:
- `owner`
  - exactly one per workspace
  - can transfer ownership
- `admin`
  - elevated workspace management role
- `member`
  - normal workspace participant

## Important invariant

There must be exactly one owner per workspace.

The schema enforces “at most one” with a partial unique index.
Application/admin flows must ensure “at least one” during owner transfer operations.

That means owner transfer should be:
- explicit
- transactional
- backend-controlled

## Relationship to module roles

Membership does not replace module authorization.

The intended evaluation order is:
1. confirm workspace membership
2. then evaluate module access inside that workspace

Some modules may grant default member capabilities even without a `workspace_module_roles` row.

## RLS note

The select policy on `public.workspace_memberships` must not query
`public.workspace_memberships` from inside its own policy expression.

That creates PostgreSQL error `42P17`:
- `infinite recursion detected in policy for relation "workspace_memberships"`

If the original recursive policy has already been applied, use:
- [workspace-memberships-policy-fix.sql](/K:/_proj-26/ai/codex/qs/docs/SQL/workspace-memberships-policy-fix.sql)
