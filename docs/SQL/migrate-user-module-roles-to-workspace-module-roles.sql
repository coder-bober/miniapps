-- Purpose:
-- Migrate the transitional global module-role rows from `public.user_module_roles`
-- into the owning user's personal workspace only.
--
-- Assumptions:
-- - `public.user_module_roles` already exists
-- - `public.workspaces` already exists
-- - personal workspaces already exist for migrated users
-- - `public.workspace_module_roles` already exists

insert into public.workspace_module_roles (
  workspace_id,
  user_id,
  module_id,
  role
)
select
  w.id as workspace_id,
  umr.user_id,
  umr.module_id,
  umr.role
from public.user_module_roles umr
join public.workspaces w
  on w.kind = 'personal'
 and w.personal_owner_user_id = umr.user_id
on conflict (workspace_id, user_id, module_id)
do update
set role = excluded.role,
    updated_at = now();
