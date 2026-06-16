# Workspace File Upload Plan

## Goal

Add a backend-owned, reusable file upload system that starts on the workspace page and is designed to grow into a general file pipeline for the product.

Initial direction:

- local SeaweedFS S3 endpoint first
- Fastify receives uploads
- Fastify validates file size, declared MIME type, and magic bytes
- Fastify stores validated files in S3-compatible storage
- metadata is stored in Postgres
- the workspace page becomes the first UI surface for uploads

## Why this approach

- fits the existing Fastify backend direction
- avoids tying file handling to Supabase Storage conventions
- keeps upload authorization and validation in the backend
- works for future public API clients and worker pipelines
- SeaweedFS gives a local S3-compatible target with a path that can later move to a managed provider

## Architectural Principles

### 1. Keep the first feature generic, not avatar-specific

The first implementation should be “workspace files”, not “avatar upload with hacks”.

That means:

- generic storage config
- generic file metadata table
- generic validation service
- workspace UI as the first product surface

### 2. Validate actual file bytes

Do not trust:

- filename extension
- browser-reported content type

Validation must include:

- file size limits
- allowlist of supported file types
- magic-byte detection

Later enhancements may include:

- image decoding/re-encoding
- document parsing
- antivirus scanning

### 3. Keep storage provider details behind Fastify services

The web app should not know about:

- local S3 endpoint details
- S3 credentials
- bucket naming logic

That belongs in:

- `api/services/storage.mjs`

### 4. Store object keys, not only full URLs

Database records should keep:

- bucket
- object key

This keeps future migration flexible:

- local SeaweedFS now
- managed S3-compatible storage later
- signed URLs later
- CDN later

## Phase Breakdown

## Phase 1: Storage Foundation

Scope:

- define S3-compatible env contract for the Fastify API
- add storage config helpers
- scaffold storage service module
- add shared API contract file for workspace files
- add a workspace page section that reserves UI space for file upload
- document local SeaweedFS setup inputs

Deliverables:

- `docs/workspace-file-upload-plan.md`
- `docs/api/seaweedfs-local-config.md`
- `api/config.mjs` updated with storage settings
- `api/services/storage.mjs`
- `src/shared/api/workspace-files.mjs`
- workspace UI placeholder in `/[locale]/workspace`

Not included yet:

- real multipart upload route
- real DB table
- actual file persistence

## Phase 2: Database and File Metadata

Scope:

- create `workspace_files` table
- add SQL docs and policies
- define a simple “default workspace” model for the first release

Recommended columns:

- `id uuid primary key`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `workspace_slug text not null default 'default'`
- `storage_bucket text not null`
- `storage_key text not null`
- `original_name text not null`
- `stored_name text not null`
- `mime_type text not null`
- `size_bytes bigint not null`
- `kind text not null`
- `created_at timestamptz not null default now()`

Optional later:

- `sha256`
- `status`
- `metadata jsonb`

## Phase 3: Fastify Upload and List Routes

Scope:

- add `POST /v1/workspace/files`
- add `GET /v1/workspace/files`
- add `DELETE /v1/workspace/files/:id`

Flow for upload:

1. verify bearer token
2. parse multipart upload
3. validate size and bytes
4. derive normalized file kind and storage key
5. upload to the S3-compatible storage backend
6. insert metadata row
7. return normalized file record

## Phase 4: Workspace UI

Scope:

- add upload form to `/[locale]/workspace`
- add uploaded-files list
- add delete action
- show upload errors and empty state

Initial UI should show:

- file name
- file type
- file size
- created date
- delete button

## Phase 5: Validation Hardening

Scope:

- add magic-byte allowlist
- add image-specific processing later if needed
- add file hashing later if needed

Likely first supported types:

- `image/jpeg`
- `image/png`
- `image/webp`
- `application/pdf`
- `text/plain`

## Phase 6: Testing

### API tests

- unauthorized upload rejected
- unsupported file rejected
- valid file accepted
- delete removes file metadata

### Integration tests

- upload with real S3-compatible local storage and Supabase test env
- verify object stored
- verify metadata row created
- verify delete removes object and row

### Browser E2E

- sign in
- upload file from workspace
- see file appear in list
- delete file
- see it disappear

## Local SeaweedFS First, Managed Later

Recommended environment model:

- local dev: SeaweedFS S3
- production: managed S3-compatible provider

The storage service should be written so that the provider can change without changing the web app.

## Recommended Implementation Order

1. Phase 1: storage foundation
2. Phase 2: `workspace_files` schema
3. Phase 3: Fastify routes
4. Phase 4: workspace UI
5. Phase 5: validation hardening
6. Phase 6: tests
