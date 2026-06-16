create table public.workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_memberships_role_check check (role in ('owner', 'admin', 'member')),
  constraint workspace_memberships_unique_user_workspace unique (workspace_id, user_id)
);

create index workspace_memberships_user_idx
on public.workspace_memberships (user_id, workspace_id);

create unique index workspace_memberships_one_owner_per_workspace_idx
on public.workspace_memberships (workspace_id)
where role = 'owner';

alter table public.workspace_memberships enable row level security;

create policy "Users can view memberships in workspaces they belong to"
on public.workspace_memberships
for select
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships viewer_membership
    where viewer_membership.workspace_id = workspace_memberships.workspace_id
      and viewer_membership.user_id = auth.uid()
  )
);

create or replace function public.handle_workspace_memberships_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_workspace_memberships_updated_at
before update on public.workspace_memberships
for each row
execute function public.handle_workspace_memberships_updated_at();
