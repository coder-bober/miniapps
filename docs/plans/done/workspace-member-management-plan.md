# Workspace Member Management Plan

## Goal

Add real member-management product behavior on top of the existing workspace core:

- view current workspace members
- add a member to a shared workspace
- change member roles
- remove a member
- transfer ownership

This should use the existing workspace model:

- `workspaces`
- `workspace_memberships`
- roles: `owner`, `admin`, `member`
- exactly one owner per workspace

The result should make shared workspaces actually collaborative, not just selectable.

## Current state

Already in place:

- personal + shared workspaces exist
- shared workspace creation exists in the shell
- workspace selection exists in the shell
- workspace-aware auth helpers exist
- workspace listing exists
- `workspace-files` and `module-lab` already consume workspace context

Still missing:

- no member list UI
- no way to add users to a shared workspace
- no role editing UI
- no ownership transfer UI
- no removal flow

So the core data model exists, but the collaboration surface does not.

## Recommended scope

Build this in two slices.

### Slice 1: MVP member management

Support:

- shared workspaces only
- list members
- add an existing user by email
- change role between `admin` and `member`
- remove non-owner members
- transfer ownership explicitly

MVP policy choices:

- member-management actions are owner-only
- member list is visible to all workspace members
- after ownership transfer, the previous owner becomes `admin`

Do not support yet:

- invitation emails
- pending invitations
- adding users who do not already exist
- bulk actions
- audit log
- per-module role management in the same UI

This keeps the first version small and compatible with the current self-hosted/test setup.

### Slice 2: Invitation/product polish

Later, add:

- invitation records
- invite email flow
- pending/accepted/expired invitation states
- richer workspace settings UX
- member search/autocomplete

## Product behavior

## Workspace eligibility

Personal workspaces:

- do not show member-management actions
- can show a read-only note explaining that personal workspaces are not collaborative

Shared workspaces:

- show member-management UI
- allow adding/removing/updating members according to actor role

## Role behavior

### Owner

Can:

- view members
- add members
- change `admin` <-> `member`
- transfer ownership to another existing member
- remove `admin` or `member`

Cannot:

- remove themselves without first transferring ownership
- create a second owner

### Admin

Can:

- view members
- no member-management actions in the MVP

Recommended first-pass restriction:

- admin cannot add members
- admin cannot change roles
- admin cannot remove members
- admin cannot transfer ownership

This is intentionally conservative.

### Member

Can:

- view members if you want collaborative visibility

Cannot:

- add members
- change roles
- remove members
- transfer ownership

Recommended first pass:

- members can view the member list
- management actions are hidden/disabled

## UX placement

The cleanest first placement is:

- keep workspace selection in the shell
- add a workspace settings surface for the currently selected workspace

Recommended first route:

- `/[locale]/workspace?tab=members`

or

- `/[locale]/settings?section=workspace-members`

Best option for this repo:

- keep it on the workspace page first
- add a member-management card/section below the existing workspace-aware content

Why:

- lower routing churn
- user already thinks of `/workspace` as the workspace-owned area
- avoids mixing account settings with workspace admin too early

## Data/API design

No new core table is required for the MVP.

The MVP can operate directly on:

- `workspaces`
- `workspace_memberships`
- `profiles`

### Required read shape

Need a server-side member list query returning:

- membership id
- workspace id
- user id
- role
- profile fields for display:
  - email
  - display name / full name if available
  - avatar if available later

Suggested response shape:

```ts
type WorkspaceMemberSummary = {
  membershipId: string;
  workspaceId: string;
  userId: string;
  role: "owner" | "admin" | "member";
  email: string | null;
  displayName: string | null;
};
```

### Required mutations

Need four operations:

1. `listWorkspaceMembers(workspaceId)`
2. `addWorkspaceMember(workspaceId, email, role)`
3. `updateWorkspaceMemberRole(workspaceId, userId, role)`
4. `removeWorkspaceMember(workspaceId, userId)`
5. `transferWorkspaceOwnership(workspaceId, newOwnerUserId)`

Ownership transfer should stay separate from generic role update.

That keeps the “exactly one owner” rule explicit and safer.

## Authorization rules

These rules should live server-side, not in the client only.

### List members

Allow:

- any workspace member

or, if you want stricter privacy:

- owner/admin only

Recommended MVP:

- any workspace member may list members

### Add member

Allow:

- owner only

### Update role

Allow:

- only owner can update roles

Recommended MVP:

- owner can update any non-owner membership to `admin` or `member`

### Remove member

Allow:

- owner removing non-owner members

Recommended MVP:

- owner only

### Transfer ownership

Allow:

- owner only

Must:

- verify target user is already a member
- update old owner and new owner in one transaction
- end with exactly one owner row

## SQL / service layer work

The SQL foundation is already present, but the app needs dedicated service operations.

Add service methods roughly like:

- `listWorkspaceMembers({ workspaceId, actorUserId })`
- `findUserProfileByEmail(email)`
- `addWorkspaceMember({ workspaceId, actorUserId, email, role })`
- `updateWorkspaceMembershipRole({ workspaceId, actorUserId, targetUserId, role })`
- `removeWorkspaceMember({ workspaceId, actorUserId, targetUserId })`
- `transferWorkspaceOwnership({ workspaceId, actorUserId, newOwnerUserId })`

### Ownership transfer implementation

This should be the most constrained operation.

Recommended implementation:

1. verify actor is current owner
2. verify target membership exists
3. in one transaction:
   - update current owner role to `admin`
   - update target membership role to `owner`

The DB unique owner index should enforce correctness if the transaction is ordered carefully.

If RPC is easier for Supabase transactionality, a SQL function is reasonable here.

## Route/API plan

Add dedicated workspace member-management routes instead of overloading `/api/workspaces`.

Suggested shape:

- `GET /api/workspaces/[workspaceId]/members`
- `POST /api/workspaces/[workspaceId]/members`
- `PATCH /api/workspaces/[workspaceId]/members/[userId]`
- `DELETE /api/workspaces/[workspaceId]/members/[userId]`
- `POST /api/workspaces/[workspaceId]/members/transfer-owner`

Mirror them in Fastify:

- `GET /v1/workspaces/:workspaceId/members`
- `POST /v1/workspaces/:workspaceId/members`
- `PATCH /v1/workspaces/:workspaceId/members/:userId`
- `DELETE /v1/workspaces/:workspaceId/members/:userId`
- `POST /v1/workspaces/:workspaceId/members/transfer-owner`

Why separate routes:

- clearer permissions
- easier tests
- safer ownership-transfer endpoint

## Frontend plan

## First UI surface

Add a new workspace member-management card/component under the workspace page.

Suggested files:

- `src/modules/workspaces/components/workspace-members-card.tsx`
- `src/modules/workspaces/components/workspace-member-row.tsx`
- `src/modules/workspaces/components/transfer-ownership-modal.tsx`

Responsibilities:

- load current workspace members
- show current role and basic identity
- allow add/remove/update based on current actor role

### Display behavior

Show:

- name or email
- current role badge
- owner/admin/member status

Show actions conditionally:

- owner:
  - add member
  - change role
  - remove
  - transfer ownership
- admin:
  - read-only list
- member:
  - read-only list

### Add-member flow

Simple first pass:

- input email
- choose role: `admin` or `member`
- submit

Server behavior:

- if no matching user exists, return a clear message like:
  - "No registered user found for that email."

This avoids inventing invitations too early.

### Transfer-owner flow

This should use a dedicated confirmation modal.

Require:

- choosing an existing member
- a clear warning that the current owner will be downgraded to `admin`

## Step-by-step implementation order

### Phase 1: Contracts and backend services

1. add shared API schemas for workspace members
2. add service-layer methods for member list/add/update/remove/transfer-owner
3. add Fastify routes
4. add Next proxy routes

### Phase 2: Read-only UI

1. add workspace members card to the workspace page
2. show member list for shared workspaces
3. show read-only state for personal workspaces
4. show current actor role and available actions

### Phase 3: Owner management actions

1. add “add member” form
2. add owner-only role change control
3. add owner-only remove action
4. add transfer ownership modal

### Phase 4: Tests

1. API tests for each permission rule
2. Next proxy tests for each permission rule
3. integration test using real memberships in a shared workspace
4. browser test for:
   - create shared workspace
   - add member
   - sign in as member
   - verify access
   - transfer owner

### Phase 5: Product polish

1. improve labels/copy
2. add empty states
3. add optimistic refresh or better loading states
4. optionally add admin-management powers beyond owner-only MVP

## Testing plan

### API tests

Add coverage for:

- owner can list members
- admin can list members
- member can list members
- non-member cannot list members
- owner can add member
- adding existing member twice is rejected cleanly
- adding non-existent email returns clear error
- owner can change role
- owner can remove member
- owner cannot remove themselves if they are sole owner
- owner can transfer ownership to an existing member
- transfer to non-member is rejected

### Next proxy tests

Add the same permission coverage at the proxy layer.

### Browser tests

Add a workspace member-management E2E flow:

1. sign in as owner
2. create shared workspace
3. add another existing fixture user as `member`
4. verify the member appears in the list
5. sign in as that member
6. verify they can access the shared workspace but not manage members
7. sign back in as owner
8. transfer ownership

This will give the first real browser proof of collaborative workspaces.

## Suggested first policy choice

If you want the safest MVP:

- any member can view member list
- only owner can add/remove/change roles/transfer ownership

Why this is a good first step:

- smallest permission matrix
- simplest UI
- avoids ambiguity around admin powers
- easy to loosen later

This is my recommended first implementation.

## Risks and edge cases

### Single-owner rule

This is the highest-risk area.

Protect against:

- removing the only owner
- demoting the only owner without promoting another
- duplicate owner rows

### Personal workspaces

Do not accidentally allow adding members to personal workspaces in MVP.

Recommended behavior:

- hide management UI entirely
- show informational note only

### Email identity

If users can change email, ensure lookups are done against current auth identity, not stale cached profile data only.

### Race conditions

Two admins/owners changing roles concurrently could create edge cases.

The owner-only MVP reduces that risk substantially.

## Success criteria

This work is successful when:

- shared workspaces can be collaboratively managed in the UI
- the owner can add an existing user by email
- the owner can change member roles
- the owner can remove members
- the owner can transfer ownership safely
- browser, API, and integration tests cover the core lifecycle

## Recommended next step after this plan

Start with the owner-only MVP:

1. backend contracts and service methods
2. read-only member list UI
3. add/remove/update for owner
4. transfer ownership

That gives the repo a real collaborative-workspace feature without needing invitations yet.
