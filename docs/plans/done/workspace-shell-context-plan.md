# Workspace Shell Context Plan

## Goal

Move workspace selection from the `workspace-files` card into the authenticated app shell so workspace becomes a real core app context instead of a module-local control.

This should give the app:
- one current workspace selection across authenticated routes
- one shared source of truth for modules
- explicit, debuggable persistence during the migration to workspace-scoped modules and RBAC

## First-pass product behavior

The first pass should behave like this:
- authenticated app pages expose the current workspace in the shell
- the shell shows a workspace switcher with:
  - workspace name
  - kind: `personal` or `shared`
  - membership role: `owner`, `admin`, or `member`
- current workspace is chosen from a URL query param first
- if the query param is missing or invalid, the app falls back to the personal default workspace
- switching workspaces causes a route transition rather than in-place state mutation
- the `workspace-files` module consumes the shell workspace context and removes its internal selector

This keeps the first iteration explicit and low-risk.

## Persistence model

Use a URL query param first:
- `workspace=<workspace-id>`

Why:
- explicit during migration
- easy to debug and test
- works across refresh and copy-paste links
- avoids inventing server-side preference storage too early

Fallback behavior:
- if `workspace` is missing, use the personal workspace
- if `workspace` points to an inaccessible workspace, fall back to personal workspace and show a small notice

Later options:
- cookie-backed preference
- server-side per-user default workspace

## Core model

Introduce a core workspace shell context under `src/core/workspaces/`.

Suggested first files:
- `src/core/workspaces/current-workspace.ts`
- `src/core/workspaces/workspace-shell-context.tsx`
- `src/core/workspaces/workspace-query.ts`
- `src/core/workspaces/workspace-switcher.tsx`

Suggested types:
- `WorkspaceSummary`
- `CurrentWorkspaceState`
- `WorkspaceShellContextValue`

The provider should expose:
- `workspaces`
- `currentWorkspace`
- `currentWorkspaceId`
- `currentWorkspaceSlug`
- `switchWorkspace(workspaceId)`

The first pass may implement `switchWorkspace(...)` as URL navigation rather than local state mutation.

## Data flow

### 1. App shell loads available workspaces

Authenticated app shell should load:
- available workspaces from `/api/workspaces`
- requested workspace id from search params

Then resolve:
- selected workspace if valid
- otherwise personal default workspace

### 2. Shell provides current workspace

The resolved workspace is provided through a core workspace context/provider.

### 3. Modules consume current workspace

Modules such as `workspace-files` receive the selected workspace from the provider instead of calling `/api/workspaces` themselves.

### 4. Module APIs keep accepting explicit workspace identity

Module API calls should continue to carry:
- `workspaceId`
- `workspaceSlug`

That keeps backend behavior explicit and avoids hidden coupling to a client-only context.

## Initial rendering strategy

Use shell/page-level server rendering to resolve the initial workspace selection where practical, then hand it to a client provider.

Recommended first shape:
- server route/page resolves available workspaces + selected workspace
- `AppPageShell` receives initial workspace state
- a client `WorkspaceShellProvider` makes it consumable below

This avoids an initial client-only flash and keeps the selected workspace stable on first render.

## Placement in UI

Put the switcher in the authenticated app shell header area, not inside one module card.

Why:
- visible on every app page
- clearly communicates current workspace
- avoids duplicate selectors per module

Suggested display:
- primary text: workspace name
- secondary badges: kind + role

Examples:
- `Avery workspace` `Personal` `Owner`
- `Team Workspace` `Shared` `Member`

## Route behavior

First pass should support the workspace query param on authenticated app routes, even if some pages do not use it yet.

Examples:
- `/en/workspace?workspace=<uuid>`
- `/en/settings?workspace=<uuid>`

Behavior by page type:
- `workspace` page: actively uses current workspace
- future workspace-owned module pages: actively use current workspace
- `profile` and `settings`: show current workspace in shell, but main content may remain account-oriented for now

## `workspace-files` migration

The first real consumer should be `workspace-files`.

Steps:
1. load current workspace from shell provider
2. remove card-local `/api/workspaces` fetch
3. remove card-local selector
4. keep existing explicit `workspaceId` and `workspaceSlug` API requests

Expected result:
- workspace switching happens once in the shell
- files module simply reflects the selected workspace

## Error handling

Cases to handle:

### Missing workspaces list
- show a shell-level warning
- fall back to a minimal default workspace state if possible

### Invalid selected workspace id
- fall back to personal workspace
- optionally normalize the URL to the valid workspace id

### Selected workspace inaccessible
- fall back to personal workspace
- show a small notice like:
  - "The requested workspace is no longer available. Showing your personal workspace."

## Ordering

Workspace order in the shell switcher:
1. personal workspace first
2. shared workspaces after that
3. stable ordering among shared workspaces, e.g. by creation time or name

This keeps the default mental model simple.

## Testing plan

### API
- `/api/workspaces` route tests already exist and should stay

### Browser
- add shell-level browser tests:
  - switcher visible in app shell
  - switch preserves selected workspace through route transition
  - `workspace-files` reflects shell-selected workspace
  - invalid workspace query falls back safely

### Integration
- existing shared-workspace `workspace-files` integration continues to prove backend access rules

## Implementation order

1. Add core workspace query + selection helpers
2. Add shell-level workspace switcher component
3. Add workspace provider/context under authenticated shell
4. Feed current workspace into `workspace-files`
5. Remove selector from `WorkspaceFilesCard`
6. Add browser tests for shell-level switching

## Out of scope for first pass

Do not do these yet:
- owner/admin/member management UI
- workspace creation UI
- server-side "remember my last workspace" preference
- module-wide automatic route rewriting
- full app-wide workspace-aware behavior for every page

Those can come after the shell context is proven with `workspace-files`.
