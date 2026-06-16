-- QuietShift initial Supabase bootstrap
--
-- Purpose:
-- - prepare a fresh Supabase project before the first user registers
-- - create all public tables, policies, triggers, and helper functions
-- - automatically create:
--   - a profile row
--   - a personal workspace
--   - an owner membership
--   for every newly registered auth user
--
-- Notes:
-- - this project uses external S3 storage, not Supabase Storage buckets
-- - intended for a clean Supabase project

begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_lowercase check (username is null or username = lower(username)),
  constraint username_format check (username is null or username ~ '^[a-z0-9_]{3,30}$')
);

create index if not exists profiles_username_idx
on public.profiles (username);

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can delete own profile" on public.profiles;
create policy "Users can delete own profile"
on public.profiles
for delete
to authenticated
using (auth.uid() = id);

create table if not exists public.workspaces (
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

create unique index if not exists workspaces_slug_idx
on public.workspaces (slug);

create unique index if not exists workspaces_personal_owner_idx
on public.workspaces (personal_owner_user_id)
where kind = 'personal';

alter table public.workspaces enable row level security;

create table if not exists public.workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_memberships_role_check check (role in ('owner', 'admin', 'member')),
  constraint workspace_memberships_unique_user_workspace unique (workspace_id, user_id)
);

create index if not exists workspace_memberships_user_idx
on public.workspace_memberships (user_id, workspace_id);

create unique index if not exists workspace_memberships_one_owner_per_workspace_idx
on public.workspace_memberships (workspace_id)
where role = 'owner';

alter table public.workspace_memberships enable row level security;

drop policy if exists "Users can view their own workspace memberships" on public.workspace_memberships;
drop policy if exists "Users can view memberships in workspaces they belong to" on public.workspace_memberships;
create policy "Users can view their own workspace memberships"
on public.workspace_memberships
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can view workspaces they belong to" on public.workspaces;
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

create table if not exists public.workspace_module_roles (
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

create index if not exists workspace_module_roles_user_idx
on public.workspace_module_roles (user_id, workspace_id, module_id);

create index if not exists workspace_module_roles_module_role_idx
on public.workspace_module_roles (workspace_id, module_id, role);

alter table public.workspace_module_roles enable row level security;

drop policy if exists "Users can view workspace module roles in workspaces they belong to" on public.workspace_module_roles;
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

create table if not exists public.workspace_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_slug text not null default 'default',
  workspace_id uuid references public.workspaces(id) on delete cascade,
  storage_bucket text not null,
  storage_key text not null,
  original_name text not null,
  stored_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  kind text not null,
  thumbnail_storage_key text,
  thumbnail_mime_type text,
  thumbnail_width integer,
  thumbnail_height integer,
  thumbnail_created_at timestamptz,
  thumbnail_status text,
  thumbnail_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_files_slug_format check (workspace_slug ~ '^[a-z0-9_-]{1,64}$'),
  constraint workspace_files_kind_check check (kind in ('image', 'document', 'other')),
  constraint workspace_files_size_positive check (size_bytes >= 0),
  constraint workspace_files_storage_key_not_empty check (length(trim(storage_key)) > 0),
  constraint workspace_files_storage_bucket_not_empty check (length(trim(storage_bucket)) > 0),
  constraint workspace_files_original_name_not_empty check (length(trim(original_name)) > 0),
  constraint workspace_files_stored_name_not_empty check (length(trim(stored_name)) > 0),
  constraint workspace_files_mime_type_not_empty check (length(trim(mime_type)) > 0)
);

create unique index if not exists workspace_files_storage_key_idx
on public.workspace_files (storage_bucket, storage_key);

create index if not exists workspace_files_user_created_idx
on public.workspace_files (user_id, created_at desc);

create index if not exists workspace_files_user_workspace_idx
on public.workspace_files (user_id, workspace_slug, created_at desc);

create index if not exists workspace_files_workspace_created_idx
on public.workspace_files (workspace_id, created_at desc);

create index if not exists workspace_files_workspace_user_created_idx
on public.workspace_files (workspace_id, user_id, created_at desc);

create index if not exists workspace_files_thumbnail_storage_key_idx
on public.workspace_files (thumbnail_storage_key)
where thumbnail_storage_key is not null;

create index if not exists workspace_files_thumbnail_status_idx
on public.workspace_files (thumbnail_status)
where thumbnail_status is not null;

alter table public.workspace_files enable row level security;

drop policy if exists "Users can view own workspace files" on public.workspace_files;
create policy "Users can view own workspace files"
on public.workspace_files
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own workspace files" on public.workspace_files;
create policy "Users can insert own workspace files"
on public.workspace_files
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own workspace files" on public.workspace_files;
create policy "Users can update own workspace files"
on public.workspace_files
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own workspace files" on public.workspace_files;
create policy "Users can delete own workspace files"
on public.workspace_files
for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_workspaces_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_workspace_memberships_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_workspace_module_roles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_workspace_files_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.transfer_workspace_ownership(
  p_workspace_id uuid,
  p_actor_user_id uuid,
  p_new_owner_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_membership public.workspace_memberships%rowtype;
  v_target_membership public.workspace_memberships%rowtype;
begin
  if p_actor_user_id = p_new_owner_user_id then
    raise exception 'Ownership can be transferred only to another workspace member.'
      using errcode = '22023';
  end if;

  select *
  into v_actor_membership
  from public.workspace_memberships
  where workspace_id = p_workspace_id
    and user_id = p_actor_user_id
  for update;

  if not found or v_actor_membership.role <> 'owner' then
    raise exception 'The current user is not allowed to transfer this workspace.'
      using errcode = '42501';
  end if;

  select *
  into v_target_membership
  from public.workspace_memberships
  where workspace_id = p_workspace_id
    and user_id = p_new_owner_user_id
  for update;

  if not found or v_target_membership.role = 'owner' then
    raise exception 'Ownership can be transferred only to another existing workspace member.'
      using errcode = '22023';
  end if;

  -- Avoid violating the partial unique owner index while changing owners.
  update public.workspace_memberships
  set role = 'admin'
  where id = v_actor_membership.id;

  update public.workspace_memberships
  set role = 'owner'
  where id = v_target_membership.id;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.handle_updated_at();

drop trigger if exists set_workspaces_updated_at on public.workspaces;
create trigger set_workspaces_updated_at
before update on public.workspaces
for each row
execute function public.handle_workspaces_updated_at();

drop trigger if exists set_workspace_memberships_updated_at on public.workspace_memberships;
create trigger set_workspace_memberships_updated_at
before update on public.workspace_memberships
for each row
execute function public.handle_workspace_memberships_updated_at();

drop trigger if exists set_workspace_module_roles_updated_at on public.workspace_module_roles;
create trigger set_workspace_module_roles_updated_at
before update on public.workspace_module_roles
for each row
execute function public.handle_workspace_module_roles_updated_at();

drop trigger if exists set_workspace_files_updated_at on public.workspace_files;
create trigger set_workspace_files_updated_at
before update on public.workspace_files
for each row
execute function public.handle_workspace_files_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  personal_workspace_id uuid;
  personal_workspace_slug text;
begin
  insert into public.profiles (
    id,
    username,
    full_name,
    avatar_url
  )
  values (
    new.id,
    null,
    null,
    null
  )
  on conflict (id) do nothing;

  personal_workspace_slug := ('user-' || substr(replace(new.id::text, '-', ''), 1, 24));

  select id
  into personal_workspace_id
  from public.workspaces
  where kind = 'personal'
    and personal_owner_user_id = new.id;

  if personal_workspace_id is null then
    insert into public.workspaces (
      kind,
      slug,
      name,
      personal_owner_user_id,
      is_public
    )
    values (
      'personal',
      personal_workspace_slug,
      'Personal workspace',
      new.id,
      false
    )
    returning id into personal_workspace_id;
  end if;

  if personal_workspace_id is not null then
    insert into public.workspace_memberships (
      workspace_id,
      user_id,
      role
    )
    values (
      personal_workspace_id,
      new.id,
      'owner'
    )
    on conflict (workspace_id, user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

commit;
