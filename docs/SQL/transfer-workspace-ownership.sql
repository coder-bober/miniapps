create or replace function public.transfer_workspace_ownership(
  p_workspace_id uuid,
  p_actor_user_id uuid,
  p_new_owner_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_membership public.workspace_memberships%rowtype;
  v_target_membership public.workspace_memberships%rowtype;
begin
  if p_actor_user_id = p_new_owner_user_id then
    raise exception 'Ownership can be transferred only to another workspace member.'
      using errcode = '22023';
  end if;

  select *
  into v_actor_membership
  from public.workspace_memberships
  where workspace_id = p_workspace_id
    and user_id = p_actor_user_id
  for update;

  if not found or v_actor_membership.role <> 'owner' then
    raise exception 'The current user is not allowed to transfer this workspace.'
      using errcode = '42501';
  end if;

  select *
  into v_target_membership
  from public.workspace_memberships
  where workspace_id = p_workspace_id
    and user_id = p_new_owner_user_id
  for update;

  if not found or v_target_membership.role = 'owner' then
    raise exception 'Ownership can be transferred only to another existing workspace member.'
      using errcode = '22023';
  end if;

  -- Avoid violating the partial unique owner index while changing owners.
  update public.workspace_memberships
  set role = 'admin'
  where id = v_actor_membership.id;

  update public.workspace_memberships
  set role = 'owner'
  where id = v_target_membership.id;
end;
$$;
