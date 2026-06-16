# Enabled Modules Transition Plan

## Current status

Status: **done**.

Historical note: This plan is archived under `docs/plans/done`. The enabled-module foundation has landed; lower sections are retained as implementation history.

## Goal

Make the current modular-monolith foundation support turning modules on or off with minimal effort, starting with `workspace-files`.

The first target is feature availability, not uninstalling schema or data. When a module is disabled:
- it should disappear from navigation and app-surface composition
- its backend routes should not register
- its jobs should not register
- its explicit Next.js routes should return `notFound()`
- its proxy routes should return `404`

## Current State

The repo already has:
- module manifests
- frontend and backend registries
- module-driven navigation
- backend route registration from module metadata
- module-driven workspace shell metadata
- `ENABLED_MODULES=workspace-files` in `.env.local` and `.env.e2e.local`

What is still missing:
- parsing and normalizing enabled module ids
- registry filtering
- route/API guards for explicit route files

## Scope For First Iteration

Implement enabled-module control for:
- frontend registry
- backend registry
- `workspace-files` page route
- `workspace-files` Next proxy routes

Do not implement yet:
- runtime admin UI for toggling modules
- DB-backed module settings
- schema teardown when disabling a module
- dynamic install/uninstall behavior

## Phase 1: Shared Enabled-Modules Config

Add a small shared helper that:
- reads `ENABLED_MODULES` from `process.env`
- splits comma-separated values
- trims and deduplicates ids
- treats empty/missing as “all modules enabled” or “explicit allowlist”, depending on the chosen policy

Recommended policy for this repo:
- if `ENABLED_MODULES` is unset: enable all registered modules
- if `ENABLED_MODULES` is set: enable only listed modules

Recommended files:
- `src/shared/modules/enabled-modules.ts`
- optionally a backend shim if ESM/TS boundaries make shared import awkward

Exports should include:
- `getEnabledModuleIds()`
- `isModuleEnabled(moduleId)`

## Phase 2: Frontend Registry Filtering

Update the frontend registry/helpers so only enabled modules are exposed to:
- module navigation
- module surface metadata
- module page metadata lookup

Targets:
- `src/modules/registry.ts`
- `src/modules/navigation.ts`
- any helper that resolves a module by id

Expected behavior:
- disabled modules contribute no nav items
- disabled modules cannot resolve page metadata/surface metadata

## Phase 3: Backend Registry Filtering

Update the backend registry/helpers so only enabled modules are exposed to:
- route registration
- job registration
- job handlers

Targets:
- `api/modules/registry.mjs`
- `api/modules/jobs.mjs`

Expected behavior:
- disabled modules register no Fastify routes
- disabled modules contribute no BullMQ jobs
- disabled modules contribute no worker handlers

## Phase 4: Explicit Next Route Guards

Because Next routes are file-based, module filtering alone is not enough.

For explicit module-owned route entry files, add guards:
- if module disabled: `notFound()`
- if enabled: continue normal route helper flow

First target:
- `src/app/[locale]/(app)/workspace/page.tsx`

This route should check `isModuleEnabled("workspace-files")` before rendering metadata or page content.

## Phase 5: Proxy/API Route Guards

The same applies to explicit Next proxy routes.

Guard these routes:
- `src/app/api/workspace-files/route.ts`
- `src/app/api/workspace-files/[id]/route.ts`
- `src/app/api/workspace-files/[id]/thumbnail/route.ts`

Expected behavior:
- when disabled, return `404`
- when enabled, proxy as usual

## Phase 6: Module Lookup Safety

Harden helper behavior when a module is disabled:
- lookup helpers should return `null` instead of assuming module presence
- module route wrappers should fail clearly if asked to resolve a disabled module

Targets:
- `src/modules/registry.ts`
- `src/core/routes/module-app-route.tsx`
- `src/core/modules/module-app-page-shell.tsx`

## Phase 7: Verification

Validation should include:
- `npm run lint`
- `npm run build`
- `npm run test:api`
- `npm run test:e2e:auth`

Manual checks with `ENABLED_MODULES=workspace-files`:
- workspace nav is visible
- workspace page loads
- workspace API routes work

Manual checks with `ENABLED_MODULES=` excluding `workspace-files`:
- workspace nav is absent
- `/en/workspace` returns 404
- `/api/workspace-files` returns 404
- backend worker does not register `workspace-files.generate-thumbnail`

## Recommended Implementation Order

1. Add shared enabled-modules config helper
2. Filter frontend and backend registries
3. Guard `workspace` page route
4. Guard `workspace-files` proxy routes
5. Harden module lookup helpers
6. Verify on/off behavior with `workspace-files`

## Success Criteria

The transition is successful when:
- `workspace-files` can be disabled by config without code edits
- disabled modules disappear from navigation and route composition
- disabled modules expose no backend routes or jobs
- explicit file-based routes return 404 cleanly
- the pattern is reusable for the next real module
