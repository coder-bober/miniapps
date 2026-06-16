# Workspace Files Schema Notes

## First release model

The first release keeps the workspace model intentionally simple:

- every file belongs to exactly one authenticated user
- every file starts in a personal workspace slug
- the default slug is `default`

This means the initial product behavior is:

- no shared workspaces yet
- no team-level file visibility yet
- no cross-user file ownership yet

The schema is still shaped so those features can be added later without throwing away the table.

## Why `workspace_slug` exists already

Even though the first release uses `default`, the column is included now because it gives a clean forward path to:

- multiple workspaces per user
- workspace-specific filtering
- future team/shared workspace concepts
- route-level or API-level workspace context later

## Why bucket + key are stored

The table stores:

- `storage_bucket`
- `storage_key`

instead of only a full URL because that keeps the storage layer flexible:

- local SeaweedFS now
- managed S3-compatible storage later
- signed URLs later
- CDN later

## Why `stored_name` exists separately from `original_name`

- `original_name` preserves the user-facing filename
- `stored_name` preserves the normalized filename chosen by the backend

This is useful because storage-safe filenames often should not exactly match raw user input.

## RLS model

The initial RLS rules are user-scoped:

- user can select own files
- user can insert own files
- user can update own files
- user can delete own files

Even if the backend writes with elevated credentials later, keeping RLS correct now makes future client-safe access patterns easier.

## Future expansion

Likely future additions:

- `sha256`
- `status`
- `metadata jsonb`
- `deleted_at`
- `workspace_id` once real workspace entities exist

## Suggested next step

After applying `workspace-files.sql`, the next implementation phase is:

- Fastify upload/list/delete routes
- storage service integration
- then workspace UI actions
