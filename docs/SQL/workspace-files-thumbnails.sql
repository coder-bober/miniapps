alter table public.workspace_files
add column if not exists thumbnail_storage_key text,
add column if not exists thumbnail_mime_type text,
add column if not exists thumbnail_width integer,
add column if not exists thumbnail_height integer,
add column if not exists thumbnail_created_at timestamptz;

create index if not exists workspace_files_thumbnail_storage_key_idx
on public.workspace_files (thumbnail_storage_key)
where thumbnail_storage_key is not null;
