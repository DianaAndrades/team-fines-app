alter table public.fines
add column dispute_reason text,
add column disputed_at timestamptz,
add column disputed_by uuid references public.profiles(id),
add column dispute_remaining_seconds numeric;

alter table public.fines
add constraint fines_dispute_timer_state_check check (
  (status = 'DISPUTED' and dispute_remaining_seconds is not null and dispute_remaining_seconds > 0)
  or (status <> 'DISPUTED' and dispute_remaining_seconds is null)
);

create or replace function public.apply_due_fine_doublings(
  p_fine_id uuid,
  p_effective_at timestamptz
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fine public.fines%rowtype;
  v_scheduled_at timestamptz;
  v_previous_amount numeric;
  v_new_amount numeric;
  v_inserted integer;
  v_applied integer := 0;
begin
  select *
  into v_fine
  from public.fines
  where id = p_fine_id
  for update;

  if not found or v_fine.status <> 'PENDING' then
    return 0;
  end if;

  while v_fine.next_doubling_at is not null
    and v_fine.next_doubling_at <= p_effective_at loop
    v_scheduled_at := v_fine.next_doubling_at;
    v_previous_amount := v_fine.current_amount_minor;
    v_new_amount := v_previous_amount * 2;

    insert into public.fine_events(
      fine_id,
      type,
      actor_user_id,
      previous_amount_minor,
      new_amount_minor,
      scheduled_at,
      metadata
    )
    values (
      v_fine.id,
      'DOUBLED',
      null,
      v_previous_amount,
      v_new_amount,
      v_scheduled_at,
      jsonb_build_object('source', 'deadline')
    )
    on conflict do nothing;

    get diagnostics v_inserted = row_count;

    if v_inserted = 1 then
      v_fine.current_amount_minor := v_new_amount;
      v_applied := v_applied + 1;
    end if;

    v_fine.next_doubling_at := v_scheduled_at + interval '7 days';

    update public.fines
    set current_amount_minor = v_fine.current_amount_minor,
        next_doubling_at = v_fine.next_doubling_at
    where id = v_fine.id;
  end loop;

  return v_applied;
end;
$$;

revoke execute on function public.apply_due_fine_doublings(uuid, timestamptz)
from public, anon, authenticated;

create or replace function public.open_fine_dispute(
  p_fine_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fine public.fines%rowtype;
  v_reason text := trim(coalesce(p_reason, ''));
  v_remaining numeric;
begin
  if auth.uid() is null then
    raise exception 'INSUFFICIENT_PERMISSION' using errcode = '42501';
  end if;

  perform public.apply_due_fine_doublings(p_fine_id, now());

  select *
  into v_fine
  from public.fines
  where id = p_fine_id
  for update;

  if not found then
    raise exception 'FINE_NOT_FOUND' using errcode = '22023';
  end if;

  if v_fine.status <> 'PENDING' then
    raise exception 'INVALID_FINE_STATE' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.team_members tm
    where tm.id = v_fine.player_team_member_id
      and tm.team_id = v_fine.team_id
      and tm.user_id = auth.uid()
      and tm.role = 'PLAYER'
      and tm.status = 'ACTIVE'
  ) then
    raise exception 'INSUFFICIENT_PERMISSION' using errcode = '42501';
  end if;

  if length(v_reason) not between 3 and 1000 then
    raise exception 'INVALID_DISPUTE_REASON' using errcode = '22023';
  end if;

  if v_fine.next_doubling_at is null or v_fine.next_doubling_at <= now() then
    raise exception 'INVALID_FINE_STATE' using errcode = '22023';
  end if;

  v_remaining := extract(epoch from (v_fine.next_doubling_at - now()));

  update public.fines
  set status = 'DISPUTED',
      next_doubling_at = null,
      dispute_remaining_seconds = v_remaining,
      dispute_reason = v_reason,
      disputed_at = now(),
      disputed_by = auth.uid()
  where id = p_fine_id;

  insert into public.fine_events(
    fine_id,
    type,
    actor_user_id,
    previous_amount_minor,
    new_amount_minor,
    metadata
  )
  values (
    p_fine_id,
    'DISPUTE_OPENED',
    auth.uid(),
    v_fine.current_amount_minor,
    v_fine.current_amount_minor,
    jsonb_build_object('reason', v_reason, 'remaining_seconds', v_remaining)
  );
end;
$$;

create or replace function public.accept_fine_dispute(
  p_fine_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fine public.fines%rowtype;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  if auth.uid() is null then
    raise exception 'INSUFFICIENT_PERMISSION' using errcode = '42501';
  end if;

  select *
  into v_fine
  from public.fines
  where id = p_fine_id
  for update;

  if not found then
    raise exception 'FINE_NOT_FOUND' using errcode = '22023';
  end if;

  if not public.is_team_staff(v_fine.team_id) then
    raise exception 'INSUFFICIENT_PERMISSION' using errcode = '42501';
  end if;

  if v_fine.status <> 'DISPUTED' then
    raise exception 'INVALID_FINE_STATE' using errcode = '22023';
  end if;

  if length(v_reason) not between 3 and 1000 then
    raise exception 'INVALID_DISPUTE_REASON' using errcode = '22023';
  end if;

  update public.fines
  set status = 'CANCELLED',
      next_doubling_at = null,
      dispute_remaining_seconds = null,
      cancelled_at = now(),
      cancelled_by = auth.uid(),
      cancellation_reason = v_reason
  where id = p_fine_id;

  insert into public.fine_events(
    fine_id,
    type,
    actor_user_id,
    previous_amount_minor,
    new_amount_minor,
    metadata
  )
  values (
    p_fine_id,
    'DISPUTE_ACCEPTED',
    auth.uid(),
    v_fine.current_amount_minor,
    v_fine.current_amount_minor,
    jsonb_build_object('reason', v_reason)
  );
end;
$$;

create or replace function public.reject_fine_dispute(
  p_fine_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fine public.fines%rowtype;
  v_reason text := trim(coalesce(p_reason, ''));
  v_next_doubling_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'INSUFFICIENT_PERMISSION' using errcode = '42501';
  end if;

  select *
  into v_fine
  from public.fines
  where id = p_fine_id
  for update;

  if not found then
    raise exception 'FINE_NOT_FOUND' using errcode = '22023';
  end if;

  if not public.is_team_staff(v_fine.team_id) then
    raise exception 'INSUFFICIENT_PERMISSION' using errcode = '42501';
  end if;

  if v_fine.status <> 'DISPUTED' or v_fine.dispute_remaining_seconds is null then
    raise exception 'INVALID_FINE_STATE' using errcode = '22023';
  end if;

  if length(v_reason) not between 3 and 1000 then
    raise exception 'INVALID_DISPUTE_REASON' using errcode = '22023';
  end if;

  v_next_doubling_at := now()
    + make_interval(secs => v_fine.dispute_remaining_seconds::double precision);

  update public.fines
  set status = 'PENDING',
      next_doubling_at = v_next_doubling_at,
      dispute_remaining_seconds = null
  where id = p_fine_id;

  insert into public.fine_events(
    fine_id,
    type,
    actor_user_id,
    previous_amount_minor,
    new_amount_minor,
    metadata
  )
  values (
    p_fine_id,
    'DISPUTE_REJECTED',
    auth.uid(),
    v_fine.current_amount_minor,
    v_fine.current_amount_minor,
    jsonb_build_object('reason', v_reason)
  );
end;
$$;

revoke execute on function public.open_fine_dispute(uuid, text) from public, anon;
revoke execute on function public.accept_fine_dispute(uuid, text) from public, anon;
revoke execute on function public.reject_fine_dispute(uuid, text) from public, anon;

grant execute on function public.open_fine_dispute(uuid, text) to authenticated;
grant execute on function public.accept_fine_dispute(uuid, text) to authenticated;
grant execute on function public.reject_fine_dispute(uuid, text) to authenticated;
