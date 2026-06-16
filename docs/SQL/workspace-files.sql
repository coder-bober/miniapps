create table public.workspace_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_slug text not null default 'default',
  storage_bucket text not null,
  storage_key text not null,
  original_name text not null,
  stored_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  kind text not null,
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

create unique index workspace_files_storage_key_idx
on public.workspace_files (storage_bucket, storage_key);

create index workspace_files_user_created_idx
on public.workspace_files (user_id, created_at desc);

create index workspace_files_user_workspace_idx
on public.workspace_files (user_id, workspace_slug, created_at desc);

alter table public.workspace_files enable row level security;

create policy "Users can view own workspace files"
on public.workspace_files
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own workspace files"
on public.workspace_files
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own workspace files"
on public.workspace_files
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own workspace files"
on public.workspace_files
for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.handle_workspace_files_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_workspace_files_updated_at
before update on public.workspace_files
for each row
execute function public.handle_workspace_files_updated_at();
