# Workspace BBB Public Module Plan

## Goal

Extend the new workspace shell/public context so it supports:
- `bbb=<workspace-id>` instead of `workspace=<workspace-id>`
- visible fallback notices when the requested workspace is invalid or inaccessible
- public workspace-aware module pages
- `module-lab` as the first dual-surface consumer of that workspace context

This is the next step after the shell-level workspace switcher and `workspace-files` integration.

## Decisions

These are fixed for this iteration:
- keep workspace switcher visible across the authenticated app shell
- `profile` remains mostly account-scoped even though the shell shows current workspace
- persist workspace selection through URL query param `bbb`
- default module access is membership-only unless a module opts into stricter roles
- public page content may become workspace-aware
- only workspaces explicitly marked public may affect public pages
- first reuse target is `module-lab`

## Scope

This plan covers:
1. rename shell/query persistence from `workspace` to `bbb`
2. add visible fallback notice behavior
3. add public-workspace support in the workspace model and API helpers
4. make `module-lab` consume workspace context on:
   - public page content
   - signed-in diagnostics/actions

It does not yet cover:
- workspace admin UI
- public workspace browsing/index pages
- server-side "remember my last workspace" preferences
- generalizing every module to public workspace content immediately

## `bbb` query parameter

Replace:
- `?workspace=<workspace-id>`

With:
- `?bbb=<workspace-id>`

Meaning:
- `bbb` is the selected basic building block workspace context
- authenticated app shell uses it for current workspace selection
- public module pages may also use it when the referenced workspace is public

### First-pass behavior

Authenticated app shell:
- if `bbb` is missing, fall back to the personal workspace
- if `bbb` is valid and accessible, select that workspace
- if `bbb` is invalid/inaccessible, fall back visibly

Public module page:
- if `bbb` references a public workspace, render that workspace’s public module content
- otherwise, fall back visibly to generic/default public content

## Fallback notice behavior

Do not fail silently.

If `bbb` is invalid or inaccessible:
- fall back to a valid default context
- show a visible notice in the shell or page surface

Recommended messages:
- authenticated shell:
  - "The requested workspace is not available. Showing your personal workspace."
- public module page:
  - "The requested workspace is not public. Showing the default public view."

The notice should be:
- non-blocking
- dismissless for now
- easy to spot but not dominant

## Public workspace model

Public workspace-aware module pages require a public flag in the core workspace model.

### Recommended schema evolution

Add to `public.workspaces`:
- `is_public boolean not null default false`

Purpose:
- determines whether anonymous/public module surfaces may resolve workspace content

This should apply only to public-facing module content, not to authenticated membership.

### Public access rule

Anonymous/public route resolution may use a workspace only when:
- workspace exists
- `is_public = true`

Otherwise:
- ignore the requested workspace for public rendering
- show fallback notice

## Core lookup layers

Add two distinct resolution paths:

### 1. Authenticated current workspace resolution

Used by app shell and authenticated module actions.

Input:
- `userId`
- `bbb`

Output:
- resolved workspace if the user belongs to it
- otherwise fallback to personal workspace plus notice state

### 2. Public workspace resolution

Used by public module pages like `module-lab`.

Input:
- `bbb`

Output:
- resolved workspace if it exists and `is_public = true`
- otherwise generic/default public context plus notice state

Keep these paths separate. Public access should not reuse authenticated membership logic.

## `module-lab` target behavior

`module-lab` becomes the first module that uses workspace context on both surfaces.

### Public surface

`/[locale]/module-lab?bbb=<workspace-id>`

Behavior:
- if workspace is public, public module-lab content reflects that workspace
- if missing/invalid/private, public module-lab shows default public content plus fallback notice

### Signed-in surface on the same route

Signed-in users continue to see diagnostics/actions, but now those diagnostics should also reflect the selected current workspace context.

That means:
- `module-lab.read`
- `module-lab.run_job`
- queue payloads
- any visible diagnostics context

should all be tied to the selected workspace when one is active

For the first pass, `module-lab` can still keep simple demo behavior, but the workspace should be visible and included in responses/payloads.

## Shell-level changes

### 1. Query key rename

Update:
- workspace shell provider
- workspace switcher navigation
- browser tests

From:
- `workspace`

To:
- `bbb`

### 2. Notice support

Extend shell context with:
- `fallbackNotice: string | null`

Use this when:
- `bbb` is missing and no workspace fallback exists
- `bbb` is invalid
- `bbb` points to inaccessible workspace

### 3. URL stability

Switching workspaces in shell should keep current route/path and replace only the `bbb` query value.

## Public module changes

### 1. Public workspace resolver

Add a core public workspace helper under `src/core/workspaces/`.

Suggested:
- `resolvePublicWorkspaceContext(bbb)`

It should:
- read workspaces by id
- require `is_public = true`
- return:
  - resolved workspace
  - fallback notice if not usable

### 2. Public module route helper integration

Public module route rendering should accept:
- public workspace context
- optional fallback notice

So future modules can use the same pattern, not just `module-lab`.

## API and backend follow-up

For this iteration, the main backend additions are:
- workspace `is_public`
- public workspace lookup path
- optional workspace context included in `module-lab` backend/proxy responses

Do not overbuild a full public workspace API yet.

## Testing plan

### API
- add tests for `bbb` query handling in shell/provider-adjacent logic where possible
- add tests for public workspace lookup:
  - public workspace works
  - private workspace falls back

### Browser
- update workspace shell/browser tests to use `bbb`
- add `module-lab` public tests for:
  - generic default public content
  - public workspace content via `bbb`
  - private/non-public `bbb` fallback notice

### Integration
- likely not needed for the public flag alone in the first pass
- keep focus on route/browser behavior

## Implementation order

1. rename shell context query param to `bbb`
2. add shell fallback notice state and UI
3. add `is_public` to workspace SQL/docs
4. add public workspace resolver
5. make `module-lab` public page consume public workspace context
6. update signed-in `module-lab` diagnostics to reflect selected workspace context
7. update tests

## Recommended first SQL/docs follow-up

Add:
- `docs/SQL/workspaces-public-flag.sql`
- update workspaces notes to document `is_public`

This keeps the public module path explicit in the workspace core model.
