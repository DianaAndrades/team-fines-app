create or replace function public.transfer_ownership(
  p_team_id uuid,
  p_target_team_member_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
begin
  if auth.uid() is null then
    raise exception 'OWNER_REQUIRED' using errcode = '42501';
  end if;

  -- Serialize team administration, then lock both memberships in stable order.
  perform 1 from public.teams where id = p_team_id for update;

  perform 1
  from public.team_members
  where team_id = p_team_id
    and (user_id = auth.uid() or id = p_target_team_member_id)
  order by id
  for update;

  select id into v_owner_id
  from public.team_members
  where team_id = p_team_id
    and user_id = auth.uid()
    and role = 'OWNER'
    and status = 'ACTIVE';

  if v_owner_id is null then
    raise exception 'OWNER_REQUIRED' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.team_members
    where id = p_target_team_member_id
      and team_id = p_team_id
      and status = 'ACTIVE'
      and id <> v_owner_id
  ) then
    raise exception 'INVALID_TRANSFER_TARGET' using errcode = '22023';
  end if;

  update public.team_members set role = 'COACH' where id = v_owner_id;
  update public.team_members set role = 'OWNER' where id = p_target_team_member_id;
end;
$$;

revoke execute on function public.transfer_ownership(uuid, uuid) from public, anon;
grant execute on function public.transfer_ownership(uuid, uuid) to authenticated;
