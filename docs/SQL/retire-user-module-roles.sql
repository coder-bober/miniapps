-- Retire the transitional global module-role table after migration to workspace-scoped RBAC.
--
-- Preconditions:
-- - existing rows from public.user_module_roles have been migrated with
--   docs/SQL/migrate-user-module-roles-to-workspace-module-roles.sql
-- - runtime paths use workspace_memberships + workspace_module_roles
-- - WORKSPACE_RBAC_STRICT=true has been verified in the target environment

begin;

drop table if exists public.user_module_roles cascade;
drop function if exists public.handle_user_module_roles_updated_at() cascade;

commit;
