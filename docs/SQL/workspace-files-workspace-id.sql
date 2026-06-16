-- Purpose:
-- Start migrating `public.workspace_files` from logical `workspace_slug`
-- to real `workspace_id` while keeping the current compatibility field.
--
-- Assumptions:
-- - `public.workspaces` already exists
-- - personal workspaces already exist for users
-- - existing rows with `workspace_slug = 'default'` belong to the user's personal workspace

alter table public.workspace_files
add column workspace_id uuid references public.workspaces(id) on delete cascade;

update public.workspace_files wf
set workspace_id = w.id
from public.workspaces w
where wf.workspace_id is null
  and wf.workspace_slug = 'default'
  and w.kind = 'personal'
  and w.personal_owner_user_id = wf.user_id;

create index workspace_files_workspace_created_idx
on public.workspace_files (workspace_id, created_at desc);

create index workspace_files_workspace_user_created_idx
on public.workspace_files (workspace_id, user_id, created_at desc);

-- Optional follow-up once the application fully switches to workspace_id:
-- alter table public.workspace_files
--   alter column workspace_id set not null;
--
-- Optional follow-up once `workspace_slug` is fully retired:
-- drop index if exists workspace_files_user_workspace_idx;
-- alter table public.workspace_files drop column workspace_slug;
