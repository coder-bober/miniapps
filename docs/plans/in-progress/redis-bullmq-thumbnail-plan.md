# Redis + BullMQ Thumbnail Pipeline Plan

## Current status

Status: **in progress**.

Completed:

- Phase 1 queue foundation is complete.
- BullMQ and Redis integration exists in `api/core/queue/bullmq.mjs`.
- Queue service abstraction exists in `api/core/queue/service.mjs`.
- Worker entrypoint exists in `api/worker.mjs` and starts BullMQ workers for registered module jobs.
- Module job registration exists; `workspace-files.generate-thumbnail` is registered by `api/modules/workspace-files/manifest.mjs`.
- Phase 2 image thumbnail processing is complete for supported image uploads.
- Upload flow enqueues a thumbnail job after a workspace file is stored.
- Image thumbnail generation exists in `api/modules/workspace-files/jobs/generate-thumbnail.mjs` using `sharp`.
- Phase 3 thumbnail state/display plumbing is complete.
- Thumbnail metadata/status fields are represented in SQL/docs and Supabase service methods.
- UI/API paths can expose thumbnail state and thumbnail image routes.

Still pending:

- Phase 4 non-image previews are not implemented yet. Current worker skips non-image files with `status: "skipped"` and a “not supported yet” error.
- PDF, Markdown, and plain-text preview rendering remain future phases.
- Worker observability/ops can be expanded beyond basic BullMQ log events.
- Retry/dead-letter/admin handling should be revisited once there are production-like workloads.

## Goal

Introduce a background job pipeline so every uploaded workspace file gets a thumbnail or preview image.

First requirement:

- every uploaded file should have a thumbnail workflow

Future requirement:

- non-image files such as PDF, Markdown, and plain text should also produce a small image preview

## Why Redis + BullMQ

This project already has:

- Next.js web app
- Fastify backend
- S3-compatible storage
- workspace file upload flow

Adding thumbnail generation directly inside the upload request would work for small images, but it creates the wrong execution model long term:

- uploads become slower
- failures are harder to retry
- CPU-heavy work stays inside the request path
- future preview rendering for PDFs and text becomes awkward

Redis + BullMQ is a good fit because:

- BullMQ gives a mature Node job system
- Redis stores queue state and coordinates workers
- the API can enqueue work without doing the processing inline
- workers can scale independently later

## High-Level Architecture

### Request path

1. user uploads a file
2. Fastify validates and stores the original file
3. Fastify inserts the `workspace_files` metadata row
4. Fastify enqueues a thumbnail job
5. upload request returns immediately

### Worker path

1. worker consumes thumbnail job from BullMQ
2. worker downloads the original file from S3-compatible storage
3. worker generates a thumbnail/preview image
4. worker uploads the thumbnail back to storage
5. worker updates DB metadata for the file

## Core Components

### 1. Redis

Purpose:

- queue backend for BullMQ

What it stores:

- pending jobs
- active jobs
- retries
- delayed jobs
- completed/failed state

Local dev:

- local Redis instance

Production later:

- managed Redis or equivalent

### 2. BullMQ

Purpose:

- queue abstraction used by API and worker

Main pieces:

- `Queue` for enqueuing thumbnail jobs
- `Worker` for processing thumbnail jobs
- `QueueEvents` optionally for monitoring

### 3. Fastify API

New responsibility:

- enqueue thumbnail jobs after successful file upload

Fastify should not generate thumbnails inline once the queue is introduced.

### 4. Worker process

New process in the repo:

- dedicated thumbnail worker

Responsibilities:

- pull jobs from BullMQ
- generate previews
- upload thumbnails
- update DB state

## Data Model Changes

The current `workspace_files` table should be extended to support thumbnail lifecycle.

Recommended additional columns:

- `thumbnail_status text not null default 'pending'`
- `thumbnail_bucket text`
- `thumbnail_key text`
- `thumbnail_mime_type text`
- `thumbnail_width integer`
- `thumbnail_height integer`
- `thumbnail_error text`
- `thumbnail_updated_at timestamptz`

Recommended allowed `thumbnail_status` values:

- `pending`
- `processing`
- `ready`
- `failed`

Why this matters:

- UI can show progress/state
- retries can be visible
- failures can be debugged without digging into logs

## Storage Layout

Keep originals and thumbnails separate.

Example:

- original:
  - `workspace/{userId}/{workspaceSlug}/{storedFileName}`
- thumbnail:
  - `workspace/{userId}/{workspaceSlug}/thumbnails/{fileId}.webp`

Why:

- predictable lookup
- easier cleanup
- easy to regenerate thumbnails later

Recommended thumbnail output format:

- `image/webp`

Why:

- compact
- broadly supported
- good default for thumbnails

## Job Contract

Add a queue job payload with a stable shape.

Example fields:

- `fileId`
- `userId`
- `workspaceSlug`
- `storageBucket`
- `storageKey`
- `mimeType`

The job should not contain the file bytes.

Why:

- Redis should store metadata, not large payloads
- worker can fetch the original from storage

## File-Type Thumbnail Strategy

### Phase 1: image files

Supported:

- JPEG
- PNG
- WebP

Worker behavior:

- resize original image
- generate a bounded thumbnail
- store as WebP

Recommended library:

- `sharp`

### Phase 2: PDFs

Goal:

- render the first page as a thumbnail image

Possible tools later:

- `pdfjs`
- `poppler`
- other PDF rendering toolchain

### Phase 3: text / markdown

Goal:

- render formatted text onto a small image preview

Possible approach:

- create a simple server-side renderer that paints a text card preview

### Rule

Every uploaded file should enter the thumbnail pipeline, even if initial handling is:

- real thumbnail for images
- `failed` or `unsupported` placeholder status for file types not implemented yet

That keeps the pipeline universal from day one.

## API Changes

### Upload route

Current:

- validates file
- uploads original
- stores metadata

Add:

- enqueue thumbnail job after metadata insert
- initialize thumbnail status to `pending`

### File list route

Extend response so UI can see:

- `thumbnailStatus`
- thumbnail location when ready

### Optional future route

- `GET /v1/workspace/files/:id/thumbnail`

This can later provide:

- direct stream
- redirect to signed URL
- or backend-proxied image response

## Worker Design

### Worker process file

Suggested location:

- `worker/thumbnail-worker.mjs`

### Worker responsibilities

1. mark file as `processing`
2. fetch original file from storage
3. generate preview
4. upload thumbnail
5. update DB:
   - `thumbnail_status = ready`
   - thumbnail metadata fields
6. on failure:
   - set `thumbnail_status = failed`
   - save `thumbnail_error`

### Retry behavior

BullMQ should retry transient failures.

Suggested starting policy:

- `attempts: 3`
- exponential backoff

Do not retry permanently broken file formats forever.

## Environment Variables

### API / worker shared

- Redis connection URL or host/port
- storage env vars
- Supabase env vars

Suggested addition:

- `REDIS_URL`

If you prefer separate pieces:

- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`

Recommended:

- one `REDIS_URL` first

## Folder / Code Structure

Suggested additions:

- `api/services/queue.mjs`
- `api/services/thumbnail-jobs.mjs`
- `worker/thumbnail-worker.mjs`
- `worker/lib/thumbnail-generation.mjs`
- `src/shared/api/workspace-files.mjs` extended with thumbnail fields
- `docs/SQL/workspace-files-thumbnails.sql`

## Implementation Phases

## Phase 1: Queue foundation

- add Redis config
- install BullMQ
- create queue helper
- enqueue thumbnail jobs after file upload
- add thumbnail fields to DB

Result:

- uploads create pending thumbnail jobs

## Phase 2: Image thumbnail worker

- create worker process
- process image uploads only
- generate WebP thumbnail with `sharp`
- update DB status and thumbnail metadata

Result:

- uploaded images get real thumbnails

## Phase 3: UI support

- extend workspace file list to show thumbnail status
- render thumbnail preview if ready
- render fallback badge/state if pending or failed

Result:

- users can see thumbnail generation progress

## Phase 4: Non-image preview generation

- PDF first-page thumbnails
- Markdown/text rendered preview cards

Result:

- every supported file type gets a visual preview path

## Testing Plan

### Unit / API level

- upload route enqueues thumbnail job
- file metadata starts as `pending`

### Worker integration

- image upload produces thumbnail object
- DB row becomes `ready`
- worker failure sets `failed`

### Browser E2E

- upload image
- file appears as pending
- thumbnail appears after processing

## Operational Notes

- keep worker separate from Fastify API
- do not make the upload request wait for thumbnail generation
- keep queue payloads small
- keep thumbnail generation idempotent where possible

## Recommended First Step

Start with:

1. DB columns for thumbnail state
2. Redis + BullMQ queue setup
3. enqueue job on upload
4. image-only thumbnail worker with `sharp`

That gives a real background-processing architecture without committing yet to PDFs/text rendering details.
