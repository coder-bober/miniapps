alter table public.workspace_files
add column if not exists thumbnail_status text,
add column if not exists thumbnail_error text;

create index if not exists workspace_files_thumbnail_status_idx
on public.workspace_files (thumbnail_status)
where thumbnail_status is not null;
