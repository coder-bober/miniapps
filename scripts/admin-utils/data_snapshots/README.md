# Data Snapshot Admin Utility

Run from the project root.

Save a snapshot:

```sh
node scripts/admin-utils/data_snapshots/snapshot-data.mjs save
```

List snapshots:

```sh
node scripts/admin-utils/data_snapshots/snapshot-data.mjs list
```

Restore a snapshot:

```sh
node scripts/admin-utils/data_snapshots/snapshot-data.mjs restore --snapshot=2026-06-18_170530 --yes
```

Snapshots are saved under `snapshots/` in this folder by default. That generated folder is ignored by git.

Snapshot folders are named with local date-time including seconds, for example:

```text
2026-06-18_170530
```

Each table is saved as one pretty-printed JSON file under `tables/`, with keys and rows sorted for easier diffs.

The default snapshot also writes:

- `auth-users.json` for Supabase auth user metadata
- one storage manifest file per configured bucket under `storage/`
- `manifest.json`

Storage object bodies are not saved by default because they are often binary and not useful for human-readable diffs. Set `storage.saveObjectBodies: true` in `config.mjs` to store object bodies as base64 files and enable storage body restore.

Auth restore uses the Supabase Admin API. It attempts to recreate users with their original IDs and a configured placeholder password. This works for self-hosted setups that accept `id` in the admin create-user payload; passwords from the original snapshot are not recoverable from Supabase.
