# Public Module Pattern

This repo now supports modules that own a public web surface as well as backend routes, jobs, and authenticated controls.

## Goal

Modules should not be limited to protected app pages.

A real module may need:
- a public, SEO-facing page for unauthorized visitors
- authenticated controls for signed-in users on the same page or on related app routes
- backend API routes
- worker jobs

`module-lab` is the first example of this pattern.

## Current shape

Key files:
- [module-manifest.ts](/K:/_proj-26/ai/codex/qs/src/shared/modules/module-manifest.ts)
- [module-public-route.tsx](/K:/_proj-26/ai/codex/qs/src/core/routes/module-public-route.tsx)
- [module-public-page-shell.tsx](/K:/_proj-26/ai/codex/qs/src/core/modules/module-public-page-shell.tsx)
- [module-lab/manifest.ts](/K:/_proj-26/ai/codex/qs/src/modules/module-lab/manifest.ts)
- [module-lab/page.tsx](/K:/_proj-26/ai/codex/qs/src/app/[locale]/module-lab/page.tsx)

The manifest can now declare:
- `publicPath`
- `resolvePublicSurface(...)`
- `resolvePublicPageMetadata(...)`
- `resolveAppSurface(...)`
- `resolveAppPageMetadata(...)`
- `jobs`

## Public surface rules

Use a public module route when the page should:
- be reachable without authentication
- be indexable by search engines
- appear in sitemap generation
- act as a marketing/editorial/product surface for the module

Do not put those pages under `/(app)`.

Protected app routes under `/(app)` remain appropriate for:
- account settings
- operational dashboards
- editorial/admin tools
- workspace-specific controls

## Recommended route model

When a module needs both public and private behavior:

1. Create a public route under:
- `src/app/[locale]/<module-slug>/page.tsx`

2. Use:
- `generatePublicModulePageMetadata(...)`
- `renderPublicModulePage(...)`

3. Let the page render:
- public content for signed-out users
- additional controls for signed-in users

That keeps one canonical SEO route while still allowing richer authenticated behavior.

Only create a separate protected route when the module truly needs an app-only surface distinct from the public page.

For modules with workspace-scoped authenticated controls, keep the public route canonical but pass workspace context through the query string. `module-lab` is the current example:

- public/marketing link: `/<locale>/module-lab`
- authenticated app link: `/<locale>/module-lab?bbb=<workspaceId>`
- client API calls: `/api/module-lab?bbb=<workspaceId>`

The bare public URL must not be treated as the authenticated workspace instance.

## SEO expectations

Public module pages should provide:
- title
- description
- canonical path
- locale alternates
- sitemap inclusion

That is handled through:
- manifest metadata resolvers
- [sitemap.ts](/K:/_proj-26/ai/codex/qs/src/app/sitemap.ts)

Private app pages should continue to use the authenticated route helpers and remain non-indexable.

## Testing expectations

At minimum, a public-capable module should have:

1. Public browser smoke coverage
- page loads while signed out
- no page errors
- no console errors
- no failed requests

2. Signed-in browser coverage
- page loads while authenticated
- authenticated controls are visible
- a representative module action works
- no page errors
- no console errors
- no failed requests

3. Backend route/job coverage
- route registration
- enable/disable behavior
- job registration and execution path

`module-lab` now covers this pattern.

## Practical guidance for future modules

For a future `news` or `blog` module:
- make the public page the primary module route
- use the module manifest for SEO metadata
- keep authoring/editorial controls either on the same page for signed-in users or on a separate protected route if needed
- register backend routes and worker jobs through the same module manifest system

This keeps the module architecture flexible without forcing everything into the protected app shell.
