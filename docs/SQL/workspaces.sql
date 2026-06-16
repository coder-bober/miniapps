create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  slug text not null,
  name text not null,
  is_public boolean not null default false,
  personal_owner_user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspaces_kind_check check (kind in ('personal', 'shared')),
  constraint workspaces_slug_format check (slug ~ '^[a-z0-9_-]{1,64}$'),
  constraint workspaces_slug_not_empty check (length(trim(slug)) > 0),
  constraint workspaces_name_not_empty check (length(trim(name)) > 0),
  constraint workspaces_personal_owner_required check (
    (kind = 'personal' and personal_owner_user_id is not null)
    or (kind = 'shared')
  )
);

create unique index workspaces_slug_idx
on public.workspaces (slug);

create unique index workspaces_personal_owner_idx
on public.workspaces (personal_owner_user_id)
where kind = 'personal';

alter table public.workspaces enable row level security;

create policy "Users can view workspaces they belong to"
on public.workspaces
for select
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships
    where workspace_memberships.workspace_id = workspaces.id
      and workspace_memberships.user_id = auth.uid()
  )
);

create or replace function public.handle_workspaces_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_workspaces_updated_at
before update on public.workspaces
for each row
execute function public.handle_workspaces_updated_at();
