create or replace function public.process_due_fines(
  p_now timestamptz,
  p_limit integer default 200
)
returns table (
  fines_inspected integer,
  doublings_applied integer,
  catchup_events integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fine_id uuid;
  v_applied integer;
  v_inspected integer := 0;
  v_doublings integer := 0;
  v_catchup integer := 0;
begin
  if p_now is null then
    raise exception 'INVALID_PROCESSING_TIME' using errcode = '22023';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 5000 then
    raise exception 'INVALID_LIMIT' using errcode = '22023';
  end if;

  for v_fine_id in
    select f.id
    from public.fines f
    where f.status = 'PENDING'
      and f.next_doubling_at is not null
      and f.next_doubling_at <= p_now
    order by f.next_doubling_at asc, f.id asc
    for update skip locked
    limit p_limit
  loop
    v_inspected := v_inspected + 1;
    v_applied := public.apply_due_fine_doublings(v_fine_id, p_now);
    v_doublings := v_doublings + v_applied;
    v_catchup := v_catchup + greatest(v_applied - 1, 0);
  end loop;

  return query
  select v_inspected, v_doublings, v_catchup;
end;
$$;

revoke execute on function public.process_due_fines(timestamptz, integer)
from public, anon, authenticated;
grant execute on function public.process_due_fines(timestamptz, integer)
to service_role;
