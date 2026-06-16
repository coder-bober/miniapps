create table public.workspace_module_roles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null,
  role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_module_roles_module_id_not_empty check (length(trim(module_id)) > 0),
  constraint workspace_module_roles_role_not_empty check (length(trim(role)) > 0),
  constraint workspace_module_roles_unique_user_workspace_module unique (workspace_id, user_id, module_id)
);

create index workspace_module_roles_user_idx
on public.workspace_module_roles (user_id, workspace_id, module_id);

create index workspace_module_roles_module_role_idx
on public.workspace_module_roles (workspace_id, module_id, role);

alter table public.workspace_module_roles enable row level security;

create policy "Users can view workspace module roles in workspaces they belong to"
on public.workspace_module_roles
for select
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships
    where workspace_memberships.workspace_id = workspace_module_roles.workspace_id
      and workspace_memberships.user_id = auth.uid()
  )
);

create or replace function public.handle_workspace_module_roles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_workspace_module_roles_updated_at
before update on public.workspace_module_roles
for each row
execute function public.handle_workspace_module_roles_updated_at();
