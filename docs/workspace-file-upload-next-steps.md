# Workspace File Upload Next Steps

This file captures the most useful follow-up work after the first end-to-end workspace file upload implementation.

Current state:

- upload exists
- list exists
- delete exists
- byte-level validation exists
- backend integration test exists
- browser E2E scaffold exists

The next steps below are ordered by practical value rather than by technical purity.

## 1. Add Download / View Support

### Why it matters

The current flow lets a user upload, list, and delete files, but not actually open them.

That means the feature is still incomplete from a product perspective.

### Recommended approach

Add a backend-owned file access route, for example:

- `GET /v1/workspace/files/:id/download`

Possible implementation models:

1. Fastify streams the object to the client
2. Fastify returns a short-lived signed URL
3. Next.js same-origin route proxies the backend response for browser UX consistency

### Recommendation for this repo

Use a backend-owned download route first.

Why:

- keeps storage details hidden
- fits the current Fastify boundary
- works for local SeaweedFS and future managed providers
- keeps the web app simple

### Outcome

Users will be able to:

- open text/PDF/image files
- download stored files directly from the workspace UI

## 2. Polish the Workspace File List UI

### Why it matters

The current list is functional but bare.

It should become easier to scan and slightly more informative without adding much complexity.

### Good improvements

- show upload date/time
- show file kind badge such as `image` or `document`
- show file count
- sort newest first explicitly
- improve empty-state copy
- improve inline error/success presentation

### Optional small enhancements

- file size formatting consistency
- icon per file kind
- clearer upload-in-progress state

### Outcome

The workspace page will feel like a real file surface instead of just a proof of concept.

## 3. Finish Browser E2E for Workspace Files

### Why it matters

The backend integration test now proves the real storage + DB path works.

The missing piece is a stable browser proof that the user can:

- upload from the workspace page
- see the file in the UI
- delete it

### Current blocker

Playwright artifact locking on Windows has caused local instability before.

The timestamped output-dir change reduces collisions, but the workspace-file browser spec still needs a clean passing run.

### Outcome

This closes the gap between backend correctness and actual browser workflow coverage.

## 4. Improve Storage Error Handling

### Why it matters

Object storage failures are some of the most common real-world operational issues.

Examples:

- wrong credentials
- missing bucket
- endpoint unavailable
- object deletion failure

### Suggested improvements

- map storage-layer errors to clearer backend error codes
- map those error codes to user-friendly UI messages
- distinguish validation errors from infrastructure errors

### Outcome

The upload feature becomes easier to debug and more understandable to users.

## 5. Extend File Validation Carefully

### Why it matters

The current byte-level validation is a good first step, but it is intentionally conservative.

### Possible next upgrades

- stronger plain-text detection
- compute `sha256` for deduplication/debugging
- normalize extensions based on detected type
- add image-specific post-processing later

### Important constraint

Do not expand the allowed types too quickly.

Keep the allowlist small until:

- storage flow is stable
- browser flow is stable
- error handling is stable

## 6. Evolve the Workspace Model

### Why it matters

The current upload feature assumes:

- one authenticated user
- one logical workspace slug: `default`

That is fine for the first release, but not for a real shared-workspace product.

### Likely future directions

- multiple workspaces per user
- real `workspace_id`
- team/shared file visibility
- role-aware file access

### Recommendation

Do not implement this next unless product requirements demand it.

Keep the current `workspace_slug` approach until the broader workspace model is ready.

## Recommended Priority Order

1. Add download/view support
2. Polish the workspace file list UI
3. Finish browser E2E for workspace files
4. Improve storage error handling
5. Extend validation carefully
6. Evolve the workspace model later
