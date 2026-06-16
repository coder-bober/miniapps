-- Purpose:
-- Fix infinite recursion in the `public.workspace_memberships` RLS policy.
--
-- Problem:
-- The original select policy queried `public.workspace_memberships` from inside
-- the policy on `public.workspace_memberships`, which causes:
--   42P17 infinite recursion detected in policy for relation "workspace_memberships"
--
-- Safe replacement:
-- Let authenticated users view only their own membership rows.
-- Workspace-wide visibility can be added later through a security definer
-- helper or an admin-specific policy when the product needs it.

drop policy if exists "Users can view memberships in workspaces they belong to"
on public.workspace_memberships;

create policy "Users can view their own workspace memberships"
on public.workspace_memberships
for select
to authenticated
using (user_id = auth.uid());
