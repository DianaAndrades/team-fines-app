create or replace function public.list_team_fines(p_team_id uuid)
returns table (
  fine_id uuid,
  team_id uuid,
  player_team_member_id uuid,
  player_name text,
  reason text,
  original_amount_minor text,
  current_amount_minor text,
  status public.fine_status,
  created_at timestamptz,
  next_doubling_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_team_member(p_team_id) then
    raise exception 'TEAM_ACCESS_DENIED' using errcode = '42501';
  end if;

  return query
  select
    f.id,
    f.team_id,
    f.player_team_member_id,
    coalesce(nullif(trim(p.display_name), ''), p.email),
    f.reason_snapshot,
    f.original_amount_minor::text,
    f.current_amount_minor::text,
    f.status,
    f.created_at,
    f.next_doubling_at
  from public.fines f
  join public.team_members tm on tm.id = f.player_team_member_id
  join public.profiles p on p.id = tm.user_id
  where f.team_id = p_team_id
  order by f.created_at desc, f.id desc;
end;
$$;

create or replace function public.list_active_season_players(p_team_id uuid)
returns table (
  team_member_id uuid,
  player_name text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_team_member(p_team_id) then
    raise exception 'TEAM_ACCESS_DENIED' using errcode = '42501';
  end if;

  return query
  select
    tm.id,
    coalesce(nullif(trim(p.display_name), ''), p.email)
  from public.seasons s
  join public.season_members sm
    on sm.season_id = s.id
    and sm.active
  join public.team_members tm
    on tm.id = sm.team_member_id
    and tm.team_id = p_team_id
    and tm.role = 'PLAYER'
    and tm.status = 'ACTIVE'
  join public.profiles p on p.id = tm.user_id
  where s.team_id = p_team_id
    and s.is_active
  order by coalesce(nullif(trim(p.display_name), ''), p.email), tm.id;
end;
$$;

create or replace function public.get_fine_detail(p_fine_id uuid)
returns table (
  fine_id uuid,
  team_id uuid,
  player_team_member_id uuid,
  player_name text,
  reason text,
  original_amount_minor text,
  current_amount_minor text,
  status public.fine_status,
  created_at timestamptz,
  next_doubling_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_team_id uuid;
begin
  select f.team_id
  into v_team_id
  from public.fines f
  where f.id = p_fine_id;

  if v_team_id is null then
    raise exception 'FINE_NOT_FOUND' using errcode = '22023';
  end if;

  if auth.uid() is null or not public.is_team_member(v_team_id) then
    raise exception 'FINE_ACCESS_DENIED' using errcode = '42501';
  end if;

  return query
  select
    f.id,
    f.team_id,
    f.player_team_member_id,
    coalesce(nullif(trim(p.display_name), ''), p.email),
    f.reason_snapshot,
    f.original_amount_minor::text,
    f.current_amount_minor::text,
    f.status,
    f.created_at,
    f.next_doubling_at
  from public.fines f
  join public.team_members tm on tm.id = f.player_team_member_id
  join public.profiles p on p.id = tm.user_id
  where f.id = p_fine_id;
end;
$$;

create or replace function public.list_fine_events(p_fine_id uuid)
returns table (
  event_id uuid,
  type public.fine_event_type,
  actor_user_id uuid,
  previous_amount_minor text,
  new_amount_minor text,
  scheduled_at timestamptz,
  metadata jsonb,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_team_id uuid;
begin
  select f.team_id
  into v_team_id
  from public.fines f
  where f.id = p_fine_id;

  if v_team_id is null then
    raise exception 'FINE_NOT_FOUND' using errcode = '22023';
  end if;

  if auth.uid() is null or not public.is_team_member(v_team_id) then
    raise exception 'FINE_ACCESS_DENIED' using errcode = '42501';
  end if;

  return query
  select
    e.id,
    e.type,
    e.actor_user_id,
    e.previous_amount_minor::text,
    e.new_amount_minor::text,
    e.scheduled_at,
    e.metadata,
    e.created_at
  from public.fine_events e
  where e.fine_id = p_fine_id
  order by e.created_at, e.id;
end;
$$;

revoke execute on function public.list_team_fines(uuid) from public, anon;
revoke execute on function public.list_active_season_players(uuid) from public, anon;
revoke execute on function public.get_fine_detail(uuid) from public, anon;
revoke execute on function public.list_fine_events(uuid) from public, anon;

grant execute on function public.list_team_fines(uuid) to authenticated;
grant execute on function public.list_active_season_players(uuid) to authenticated;
grant execute on function public.get_fine_detail(uuid) to authenticated;
grant execute on function public.list_fine_events(uuid) to authenticated;
