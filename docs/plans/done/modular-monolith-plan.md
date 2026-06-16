# Modular Monolith Plan

## Goal

Evolve this repository into a modular monolith so new product directions can be added as bounded modules instead of turning the codebase into a tangle of feature-specific conditionals.

The target outcome is:

- one repo
- one main web app
- one main backend service boundary
- clear platform/core ownership
- clear domain module ownership
- stable extension points for navigation, routes, API, permissions, and jobs

This fits the current repo well because it already has:

- Next.js web app
- Fastify backend
- shared API contract layer
- storage/file pipeline direction
- upcoming worker/queue direction

## Why this should come before bigger backend infrastructure

Redis + BullMQ is useful, but it is infrastructure.

The module system should come first because it determines:

- where future jobs belong
- which code is platform-wide
- which code is domain-specific
- how future product directions stay isolated

If you add queues before modules, jobs tend to get wired into ad hoc feature code.

If you add modules first, queue/workers become a clean core service consumed by modules.

## Current Repo Reality

Today the repo already has the early pieces of a modular monolith, just without explicit structure:

- `src/lib/i18n`, `src/lib/auth`, `src/lib/api` are effectively core
- account/settings/auth are effectively core product infrastructure
- `workspace-files` is starting to become a real domain
- Fastify now has `routes`, `services`, `plugins`, and shared API contracts

The plan below makes those boundaries explicit.

## Principles

### 1. Keep the monolith

Do not split into many deployables yet.

Keep:

- one repo
- one Next.js app
- one Fastify API

But structure code so domains are isolated internally.

### 2. Separate platform from domain

The key boundary is:

- `core`
- `modules`

If everything depends on it, it belongs in `core`.

If it is a product/domain capability that could one day become its own product area, it belongs in `modules`.

### 3. Use declared extension points, not scattered hooks

Modules should not patch random places in the codebase.

They should contribute through explicit contracts such as:

- navigation
- routes
- API endpoints
- permissions
- jobs

### 4. Keep route entry files thin

Next.js route files and Fastify route files should remain transport and composition layers.

They should not become the place where domain logic lives.

## Target Folder Structure

## Frontend / shared application structure

Recommended long-term shape:

- `src/core/`
- `src/modules/`
- `src/shared/`
- `src/app/`

### `src/core/`

Use for platform-wide concerns:

- auth
- users
- settings
- workspaces as platform identity/surface
- storage abstractions
- queue abstractions
- i18n
- theme
- permissions
- shared app shell primitives

Examples in this repo that belong in or near `core`:

- `src/lib/auth.ts`
- `src/lib/i18n/...`
- `src/lib/api/...`
- `src/components/site-header.tsx`
- `src/components/app/app-page-shell.tsx`
- auth and settings flows

### `src/modules/`

Use for domain modules.

Best first candidate in this repo:

- `workspace-files`

Future examples:

- `blog`
- `news`
- `media`
- `comments`
- `newsletter`

Suggested shape for a module:

- `src/modules/workspace-files/`
  - `manifest.ts`
  - `components/`
  - `pages/`
  - `lib/`
  - `api/` if needed for client-side helpers

### `src/shared/`

Keep for:

- shared API contracts
- shared module types
- shared validation schemas

This already exists in spirit with:

- `src/shared/api/`

That should stay the main shared contract layer.

## Backend structure

Recommended long-term shape:

- `api/core/`
- `api/modules/`
- `api/plugins/`
- `api/lib/`

### `api/core/`

Use for backend-wide concerns:

- account/session/auth routes
- storage service
- queue service
- shared backend configuration

### `api/modules/`

Use for domain-owned backend code.

Best first candidate:

- `api/modules/workspace-files/`

Suggested shape:

- `api/modules/workspace-files/routes/`
- `api/modules/workspace-files/services/`

### `api/plugins/`

Keep for Fastify wiring only:

- decorators
- hooks
- shared Fastify setup

### `api/lib/`

Keep for small transport helpers:

- auth resolution
- standardized replies
- request normalization

## First Explicit Module Candidate: `workspace-files`

This is the best feature to make the first real module because it already has:

- DB schema
- Fastify routes
- shared contracts
- UI surface
- storage integration
- upcoming thumbnail jobs

It is also likely to grow into:

- previews
- thumbnails
- media processing
- retention rules
- download/view support
- possible future extraction

Recommended ownership:

### Frontend

- workspace files card
- file-list UI
- upload/delete UX
- future thumbnail preview UI

### Backend

- workspace file routes
- metadata persistence
- storage interactions specific to workspace files
- future thumbnail job handlers

### Shared

- workspace file API contracts
- future thumbnail status contracts

## Core vs Module Ownership for Current Features

### Core

Should remain core:

- auth
- sign-in/sign-up/reset/confirmation
- settings
- account deletion
- session management
- site header
- app shell
- locale/i18n
- shared API client infrastructure
- storage abstraction
- future queue abstraction

### First module

Should become module-owned:

- `workspace-files`

Possible later module candidates:

- `blog`
- `news`
- `media`

## Module Manifest

Add a module manifest type early, even if it starts small.

Suggested file:

- `src/shared/modules/module-manifest.ts`

Suggested shape:

```ts
export type AppModule = {
  id: string;
  label: string;
  navItems?: ModuleNavItem[];
  appRoutes?: ModuleRouteDef[];
  apiMounts?: ModuleApiMountDef[];
  permissions?: ModulePermissionDef[];
  jobs?: ModuleJobDef[];
};
```

Do not overdesign this yet.

Start with the fields you can actually use soon:

- `id`
- `label`
- `navItems`
- `jobs`

Then expand later.

## Module Registry

Add a single registry that lists enabled modules.

Suggested files:

- `src/modules/registry.ts`
- `api/modules/registry.mjs`

At first, this can be explicit and static:

```ts
export const appModules = [
  workspaceFilesModule,
];
```

Why it matters:

- single source of truth for enabled modules
- navigation can build from it
- future job registration can build from it
- avoids scattered feature wiring

## Navigation Extension Point

Modules should be able to contribute nav items declaratively.

Example manifest field:

```ts
navItems: [
  {
    id: "workspace-files",
    label: "Files",
    href: "/workspace",
    area: "app",
  },
]
```

The shell remains responsible for:

- rendering the nav
- filtering by locale/auth/permissions

The module only declares what it wants to contribute.

This is important because future modules such as `blog` or `news` should not require hand-editing the header/sidebar in multiple places.

## Route Ownership Convention

Keep actual Next.js route entry files in `src/app/...`, but move route content ownership into modules where appropriate.

Recommended pattern:

- route file stays small
- route delegates to module-owned page component or feature entry

Example for this repo:

- `src/app/[locale]/(app)/workspace/page.tsx`
  - becomes a thin route
  - delegates to something like:
    - `src/modules/workspace-files/pages/workspace-files-page.tsx`

This keeps:

- Next.js routing compatible
- route ownership clear
- future extraction easier

## Backend Module Ownership Convention

Do the same on the Fastify side.

Recommended pattern:

- keep core backend routes in `api/core/`
- move domain backend routes/services into `api/modules/<module-id>/`

For this repo:

- account/session/auth routes stay core
- workspace file routes move later to:
  - `api/modules/workspace-files/routes/files.mjs`
  - `api/modules/workspace-files/services/files-service.mjs`

This keeps storage and auth infrastructure in core, while domain-specific file workflows belong to the module.

## Job Registration Slot in the Manifest

Add `jobs` to the manifest now, even before BullMQ is implemented.

Example:

```ts
jobs: [
  {
    id: "workspace-files.generate-thumbnail",
    queue: "thumbnails",
  },
]
```

At first this can be metadata only.

Why this is worth doing early:

- modules are designed with background work in mind
- future queue infrastructure plugs into an existing contract
- jobs stay module-owned instead of becoming global one-offs

This is especially relevant for this repo because `workspace-files` will likely be the first module to need real background jobs for:

- thumbnail generation
- preview rendering
- file processing

## Suggested First Refactor Steps

Do not try to modularize the entire repo in one move.

Recommended first sequence:

### Step 1

Introduce the folder boundaries:

- `src/core/`
- `src/modules/`
- `api/core/`
- `api/modules/`

This can start with moves or re-exports, not large rewrites.

### Step 2

Add:

- shared module manifest type
- module registry

Even if only one module is registered at first.

### Step 3

Make `workspace-files` the first real module:

- move workspace file UI into module-owned folder
- move workspace file page composition into module-owned page entry
- move Fastify workspace-file route/service ownership under module folders

### Step 4

Keep auth/settings/storage/i18n/core shell in `core`

Do not try to make those modules.

### Step 5

Add `jobs` field to the module manifest

Even before Redis + BullMQ exists.

## What Not To Do Yet

### 1. Do not build a dynamic plugin marketplace/runtime

That is too much complexity for this stage.

Keep modules static and code-defined.

### 2. Do not create one giant universal content table

For future blog/news/media directions, avoid a single over-generic table for everything.

Prefer:

- core shared tables where justified
- module-owned tables for module-owned domains

### 3. Do not move everything into modules

If everything becomes a module, the distinction loses meaning.

Keep platform concerns in core.

## How This Helps Future Directions

If later you want:

- personal blog
- news platform
- media workflows

You can add them as modules with:

- their own tables
- their own pages
- their own API routes
- their own jobs
- their own nav entries

without rewriting:

- auth
- settings
- i18n
- storage
- queue infrastructure
- shell/navigation framework

That is the real value of the modular-monolith approach here.

## Recommended Next Step

The best first implementation step after this plan is:

1. create the module manifest type and registry
2. make `workspace-files` the first real module
3. only after that, add Redis + BullMQ as a core service

That sequencing matches the current repo and keeps future background processing cleanly owned.
