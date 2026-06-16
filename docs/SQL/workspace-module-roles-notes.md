# Workspace Module Roles SQL Notes

## Purpose

`workspace_module_roles` adds module-specific authorization on top of baseline workspace membership.

It answers:
- what extra module role does this user have in this workspace?

It should not be used as a substitute for workspace membership.

## Relationship to memberships

The intended model is two-layer:

1. `workspace_memberships`
- baseline access to the workspace

2. `workspace_module_roles`
- extra module-specific capabilities

Examples:
- a workspace member may have default read access to a module
- an explicit module role can grant authoring/operator/publish capabilities

## Migration relationship to `user_module_roles`

The current `user_module_roles` table is transitional.

Migration rule:
- global module roles migrate only into the user’s personal workspace

They should not be copied blindly into every shared workspace.

## Unknown role behavior

If an unknown module role is found:
- server-side access resolution should deny module capabilities
- tests and operations should treat that as invalid configuration

This keeps authorization fail-closed.
