create type public.notification_type as enum (
  'NEW_FINE',
  'DOUBLING_REMINDER',
  'FINE_DOUBLED',
  'DISPUTE_RESOLVED',
  'FINE_PAID',
  'TEAM_INVITATION'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  fine_id uuid references public.fines(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text not null,
  idempotency_key text not null unique,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx
on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "users read own notifications"
on public.notifications for select
to authenticated
using (user_id = auth.uid());

create policy "users update own notifications"
on public.notifications for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

revoke all on public.notifications from anon;
revoke insert, delete on public.notifications from authenticated;
grant select on public.notifications to authenticated;
grant update(read_at) on public.notifications to authenticated;

create or replace function public.enqueue_notification(
  p_user_id uuid,
  p_team_id uuid,
  p_fine_id uuid,
  p_type public.notification_type,
  p_title text,
  p_body text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_notification_id uuid;
begin
  insert into public.notifications(
    user_id,
    team_id,
    fine_id,
    type,
    title,
    body,
    idempotency_key
  )
  values (
    p_user_id,
    p_team_id,
    p_fine_id,
    p_type,
    p_title,
    p_body,
    p_idempotency_key
  )
  on conflict (idempotency_key) do nothing
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

revoke execute on function public.enqueue_notification(
  uuid,
  uuid,
  uuid,
  public.notification_type,
  text,
  text,
  text
) from public, anon, authenticated;

create or replace function public.create_fine(
  p_team_id uuid,
  p_player_team_member_id uuid,
  p_rule_id uuid default null,
  p_custom_reason text default null,
  p_custom_amount_minor numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fine_id uuid;
  v_season_id uuid;
  v_reason text;
  v_amount numeric;
  v_created_at timestamptz := now();
  v_player_user_id uuid;
begin
  if auth.uid() is null or not public.is_team_staff(p_team_id) then
    raise exception 'INSUFFICIENT_PERMISSION' using errcode = '42501';
  end if;

  select s.id
  into v_season_id
  from public.seasons s
  where s.team_id = p_team_id
    and s.is_active;

  if v_season_id is null then
    raise exception 'INVALID_ACTIVE_SEASON' using errcode = '22023';
  end if;

  select tm.user_id
  into v_player_user_id
  from public.team_members tm
  where tm.id = p_player_team_member_id
    and tm.team_id = p_team_id
    and tm.role = 'PLAYER'
    and tm.status = 'ACTIVE'
    and exists (
      select 1
      from public.season_members sm
      where sm.season_id = v_season_id
        and sm.team_member_id = tm.id
        and sm.active
    );

  if v_player_user_id is null then
    raise exception 'INVALID_PLAYER' using errcode = '22023';
  end if;

  if p_rule_id is not null then
    select r.title, r.default_amount_minor
    into v_reason, v_amount
    from public.rules r
    where r.id = p_rule_id
      and r.team_id = p_team_id
      and r.season_id = v_season_id
      and r.is_active;

    if v_reason is null then
      raise exception 'INVALID_RULE' using errcode = '22023';
    end if;
  else
    v_reason := trim(coalesce(p_custom_reason, ''));
    v_amount := p_custom_amount_minor;

    if v_reason = ''
      or length(v_reason) > 240
      or v_amount is null
      or v_amount <= 0
      or trunc(v_amount) <> v_amount then
      raise exception 'INVALID_CUSTOM_FINE' using errcode = '22023';
    end if;
  end if;

  insert into public.fines(
    team_id,
    player_team_member_id,
    origin_season_id,
    source_rule_id,
    reason_snapshot,
    original_amount_minor,
    current_amount_minor,
    created_by,
    created_at,
    next_doubling_at
  )
  values (
    p_team_id,
    p_player_team_member_id,
    v_season_id,
    p_rule_id,
    v_reason,
    v_amount,
    v_amount,
    auth.uid(),
    v_created_at,
    v_created_at + interval '7 days'
  )
  returning id into v_fine_id;

  insert into public.fine_season_links(fine_id, season_id, link_type)
  values (v_fine_id, v_season_id, 'ORIGIN');

  insert into public.fine_events(fine_id, type, actor_user_id, new_amount_minor)
  values (v_fine_id, 'CREATED', auth.uid(), v_amount);

  perform public.enqueue_notification(
    v_player_user_id,
    p_team_id,
    v_fine_id,
    'NEW_FINE',
    'New fine',
    v_reason,
    'new-fine:' || v_fine_id::text
  );

  return v_fine_id;
end;
$$;

revoke execute on function public.create_fine(uuid, uuid, uuid, text, numeric) from public, anon;
grant execute on function public.create_fine(uuid, uuid, uuid, text, numeric) to authenticated;

create or replace function public.mark_fine_paid(p_fine_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fine public.fines%rowtype;
  v_player_user_id uuid;
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

  if v_fine.status <> 'PENDING' then
    raise exception 'INVALID_FINE_STATE' using errcode = '22023';
  end if;

  select tm.user_id
  into v_player_user_id
  from public.team_members tm
  where tm.id = v_fine.player_team_member_id;

  update public.fines
  set status = 'PAID',
      next_doubling_at = null,
      paid_at = now(),
      paid_by = auth.uid()
  where id = p_fine_id;

  insert into public.fine_events(
    fine_id,
    type,
    actor_user_id,
    previous_amount_minor,
    new_amount_minor
  )
  values (
    p_fine_id,
    'PAID',
    auth.uid(),
    v_fine.current_amount_minor,
    v_fine.current_amount_minor
  );

  perform public.enqueue_notification(
    v_player_user_id,
    v_fine.team_id,
    p_fine_id,
    'FINE_PAID',
    'Fine paid',
    v_fine.reason_snapshot,
    'fine-paid:' || p_fine_id::text
  );
end;
$$;

revoke execute on function public.mark_fine_paid(uuid) from public, anon;
grant execute on function public.mark_fine_paid(uuid) to authenticated;

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
  v_player_user_id uuid;
  v_key_timestamp text;
begin
  select *
  into v_fine
  from public.fines
  where id = p_fine_id
  for update;

  if not found or v_fine.status <> 'PENDING' then
    return 0;
  end if;

  select tm.user_id
  into v_player_user_id
  from public.team_members tm
  where tm.id = v_fine.player_team_member_id;

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
      v_key_timestamp := to_char(
        v_scheduled_at at time zone 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
      );

      perform public.enqueue_notification(
        v_player_user_id,
        v_fine.team_id,
        v_fine.id,
        'FINE_DOUBLED',
        'Fine doubled',
        v_fine.reason_snapshot,
        'fine-doubled:' || v_fine.id::text || ':' || v_key_timestamp
      );
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
  v_player_user_id uuid;
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

  select tm.user_id
  into v_player_user_id
  from public.team_members tm
  where tm.id = v_fine.player_team_member_id;

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

  perform public.enqueue_notification(
    v_player_user_id,
    v_fine.team_id,
    p_fine_id,
    'DISPUTE_RESOLVED',
    'Dispute rejected',
    v_reason,
    'dispute-resolved:' || p_fine_id::text || ':rejected'
  );
end;
$$;

revoke execute on function public.reject_fine_dispute(uuid, text) from public, anon;
grant execute on function public.reject_fine_dispute(uuid, text) to authenticated;

create or replace function public.process_due_reminders(
  p_now timestamptz,
  p_limit integer default 500
)
returns table (
  reminders_created integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fine record;
  v_notification_id uuid;
  v_created integer := 0;
  v_key_timestamp text;
begin
  if p_now is null then
    raise exception 'INVALID_PROCESSING_TIME' using errcode = '22023';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 5000 then
    raise exception 'INVALID_LIMIT' using errcode = '22023';
  end if;

  for v_fine in
    select
      f.id,
      f.team_id,
      f.reason_snapshot,
      f.next_doubling_at,
      tm.user_id
    from public.fines f
    join public.team_members tm on tm.id = f.player_team_member_id
    where f.status = 'PENDING'
      and f.next_doubling_at is not null
      and f.next_doubling_at > p_now
      and f.next_doubling_at <= p_now + interval '24 hours'
    order by f.next_doubling_at asc, f.id asc
    for update of f skip locked
    limit p_limit
  loop
    v_key_timestamp := to_char(
      v_fine.next_doubling_at at time zone 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
    );

    v_notification_id := public.enqueue_notification(
      v_fine.user_id,
      v_fine.team_id,
      v_fine.id,
      'DOUBLING_REMINDER',
      'Fine doubles soon',
      v_fine.reason_snapshot,
      'doubling-reminder:' || v_fine.id::text || ':' || v_key_timestamp
    );

    if v_notification_id is not null then
      v_created := v_created + 1;
    end if;
  end loop;

  return query select v_created;
end;
$$;

revoke execute on function public.process_due_reminders(timestamptz, integer)
from public, anon, authenticated;
grant execute on function public.process_due_reminders(timestamptz, integer)
to service_role;
