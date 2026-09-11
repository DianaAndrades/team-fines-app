create or replace function public.start_new_season(
  p_team_id uuid,
  p_name text,
  p_copy_players boolean,
  p_copy_coaches boolean,
  p_copy_rules boolean,
  p_carry_unpaid_fines boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_season_id uuid;
  v_new_season_id uuid;
  v_name text := trim(coalesce(p_name, ''));
begin
  if auth.uid() is null
    or public.team_role_for(p_team_id) is distinct from 'OWNER'::public.team_role then
    raise exception 'OWNER_REQUIRED' using errcode = '42501';
  end if;

  if length(v_name) not between 1 and 40 then
    raise exception 'INVALID_SEASON_NAME' using errcode = '22023';
  end if;

  perform 1
  from public.teams t
  where t.id = p_team_id
  for update;

  if not found then
    raise exception 'TEAM_NOT_FOUND' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.seasons s
    where s.team_id = p_team_id
      and lower(trim(s.name)) = lower(v_name)
  ) then
    raise exception 'SEASON_ALREADY_EXISTS' using errcode = '23505';
  end if;

  select s.id
  into v_old_season_id
  from public.seasons s
  where s.team_id = p_team_id
    and s.is_active
  for update;

  if v_old_season_id is null then
    raise exception 'NO_ACTIVE_SEASON' using errcode = '22023';
  end if;

  update public.seasons
  set is_active = false
  where id = v_old_season_id;

  insert into public.seasons(team_id, name, is_active)
  values (p_team_id, v_name, true)
  returning id into v_new_season_id;

  insert into public.season_members(season_id, team_member_id, active)
  select
    v_new_season_id,
    tm.id,
    true
  from public.season_members sm
  join public.team_members tm on tm.id = sm.team_member_id
  where sm.season_id = v_old_season_id
    and sm.active
    and tm.team_id = p_team_id
    and tm.status = 'ACTIVE'
    and (
      (tm.role = 'PLAYER'::public.team_role and coalesce(p_copy_players, false))
      or (
        tm.role in ('OWNER'::public.team_role, 'COACH'::public.team_role)
        and coalesce(p_copy_coaches, false)
      )
    )
  on conflict (season_id, team_member_id) do nothing;

  if coalesce(p_copy_rules, false) then
    insert into public.rules(
      team_id,
      season_id,
      title,
      description,
      default_amount_minor,
      is_active,
      created_by
    )
    select
      p_team_id,
      v_new_season_id,
      r.title,
      r.description,
      r.default_amount_minor,
      r.is_active,
      auth.uid()
    from public.rules r
    where r.team_id = p_team_id
      and r.season_id = v_old_season_id;
  end if;

  if coalesce(p_carry_unpaid_fines, false) then
    insert into public.fine_season_links(fine_id, season_id, link_type)
    select
      f.id,
      v_new_season_id,
      'CARRIED'::public.fine_season_link_type
    from public.fines f
    where f.team_id = p_team_id
      and f.status in ('PENDING'::public.fine_status, 'DISPUTED'::public.fine_status)
    on conflict (fine_id, season_id) do nothing;
  end if;

  return v_new_season_id;
end;
$$;

revoke execute on function public.start_new_season(
  uuid,
  text,
  boolean,
  boolean,
  boolean,
  boolean
) from public, anon;

grant execute on function public.start_new_season(
  uuid,
  text,
  boolean,
  boolean,
  boolean,
  boolean
) to authenticated;
