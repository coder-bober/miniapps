-- Purpose:
-- Allow workspaces to opt into public module content resolution.
--
-- This is the first schema step needed for public module pages that respond to
-- `bbb=<workspace-id>` while remaining safe for anonymous users.
--
-- Public rule:
-- - only workspaces with `is_public = true` may affect public-facing module pages
-- - authenticated membership access does not depend on `is_public`

alter table public.workspaces
add column if not exists is_public boolean not null default false;

create index if not exists workspaces_public_idx
on public.workspaces (is_public, id)
where is_public = true;
