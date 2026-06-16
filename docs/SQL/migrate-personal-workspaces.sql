-- Purpose:
-- 1. Create one personal workspace for every existing user who does not have one yet
-- 2. Create the matching owner membership for that workspace
--
-- Assumptions:
-- - `public.workspaces` already exists
-- - `public.workspace_memberships` already exists
-- - personal workspaces use slug `user-<auth.users.id>`

with users_without_personal_workspace as (
  select
    u.id as user_id,
    ('user-' || replace(u.id::text, '-', ''))::text as workspace_slug
  from auth.users u
  left join public.workspaces w
    on w.kind = 'personal'
   and w.personal_owner_user_id = u.id
  where w.id is null
),
inserted_workspaces as (
  insert into public.workspaces (
    kind,
    slug,
    name,
    personal_owner_user_id
  )
  select
    'personal',
    workspace_slug,
    'Personal workspace',
    user_id
  from users_without_personal_workspace
  returning id, personal_owner_user_id
)
insert into public.workspace_memberships (
  workspace_id,
  user_id,
  role
)
select
  id,
  personal_owner_user_id,
  'owner'
from inserted_workspaces
on conflict (workspace_id, user_id) do nothing;
