create or replace function public.list_open_disputes(p_team_id uuid)
returns table (
  fine_id uuid,
  team_id uuid,
  player_name text,
  fine_reason text,
  dispute_reason text,
  current_amount_minor numeric,
  remaining_seconds numeric,
  disputed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if auth.uid() is null or not public.is_team_staff(p_team_id) then
    raise exception 'INSUFFICIENT_PERMISSION' using errcode = '42501';
  end if;

  return query
  select
    f.id,
    f.team_id,
    coalesce(nullif(trim(p.full_name), ''), p.email, 'Player')::text,
    f.reason_snapshot,
    coalesce(f.dispute_reason, ''),
    f.current_amount_minor,
    f.dispute_remaining_seconds,
    f.disputed_at
  from public.fines f
  join public.team_members tm
    on tm.id = f.player_team_member_id
   and tm.team_id = f.team_id
  join public.profiles p on p.id = tm.user_id
  where f.team_id = p_team_id
    and f.status = 'DISPUTED'
  order by f.disputed_at asc nulls last, f.id;
end;
$$;

revoke execute on function public.list_open_disputes(uuid) from public, anon;
grant execute on function public.list_open_disputes(uuid) to authenticated;
