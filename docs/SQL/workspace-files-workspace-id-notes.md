# Workspace Files Workspace ID Notes

## Purpose

`workspace-files-workspace-id.sql` is the first schema bridge from:
- logical `workspace_slug`

to:
- real `workspace_id`

The goal is to migrate `workspace-files` first into the workspace-scoped model without breaking the current app immediately.

## Why keep `workspace_slug` temporarily

The current app and tests already depend on:
- `workspace_slug = 'default'`

Dropping that field immediately would create too much migration surface at once.

So the intended sequence is:
1. add `workspace_id`
2. backfill existing rows
3. migrate app/backend logic to prefer `workspace_id`
4. retire `workspace_slug` later

## Backfill rule

Current backfill assumption:
- `workspace_slug = 'default'`
- means the user’s personal workspace

This matches the current product direction:
- every user automatically gets one personal workspace

## Future app behavior

During migration, the application should:
- resolve `default` to the personal workspace for compatibility
- prefer `workspace_id` internally where possible
- keep dual-read behavior until all file flows stop relying on the slug

## First module migration target

`workspace-files` is intentionally the first workspace-scoped module because:
- it already exposes a workspace concept
- it already has real storage/data behavior
- it is the most natural place to validate the workspace-aware authorization model
