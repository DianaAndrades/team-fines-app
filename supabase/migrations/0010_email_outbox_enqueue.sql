create or replace function public.enqueue_email_outbox(
  p_user_id uuid,
  p_recipient_email text,
  p_template_key text,
  p_payload jsonb,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email_id uuid;
  v_recipient text := lower(trim(coalesce(p_recipient_email, '')));
begin
  if v_recipient = '' then
    return null;
  end if;

  insert into public.email_outbox(
    user_id,
    recipient_email,
    template_key,
    payload,
    idempotency_key
  )
  values (
    p_user_id,
    v_recipient,
    p_template_key,
    p_payload,
    p_idempotency_key
  )
  on conflict (idempotency_key) do nothing
  returning id into v_email_id;

  return v_email_id;
end;
$$;

revoke execute on function public.enqueue_email_outbox(
  uuid,
  text,
  text,
  jsonb,
  text
) from public, anon, authenticated;

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
  v_email text;
  v_team_name text;
  v_currency_code text;
  v_player_name text;
  v_reason text;
  v_current_amount numeric;
  v_event_amount numeric;
  v_payload jsonb;
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

  if v_notification_id is null or p_fine_id is null then
    return v_notification_id;
  end if;

  select
    pr.email,
    t.name,
    t.currency_code,
    coalesce(nullif(trim(pr.display_name), ''), pr.email),
    f.reason_snapshot,
    f.current_amount_minor
  into
    v_email,
    v_team_name,
    v_currency_code,
    v_player_name,
    v_reason,
    v_current_amount
  from public.fines f
  join public.teams t on t.id = f.team_id
  join public.profiles pr on pr.id = p_user_id
  where f.id = p_fine_id
    and f.team_id = p_team_id;

  if v_email is null or v_email = '' then
    return v_notification_id;
  end if;

  if p_type = 'FINE_DOUBLED' then
    select fe.new_amount_minor
    into v_event_amount
    from public.fine_events fe
    where fe.fine_id = p_fine_id
      and fe.type = 'DOUBLED'
      and fe.new_amount_minor is not null
    order by fe.scheduled_at desc nulls last, fe.created_at desc, fe.id desc
    limit 1;

    v_current_amount := coalesce(v_event_amount, v_current_amount);
  end if;

  v_payload := jsonb_build_object(
    'notificationType', p_type::text,
    'teamId', p_team_id::text,
    'fineId', p_fine_id::text,
    'teamName', v_team_name,
    'playerName', v_player_name,
    'reason', v_reason,
    'currentAmountMinor', v_current_amount::text,
    'currencyCode', v_currency_code
  );

  if p_type = 'DOUBLING_REMINDER' then
    v_payload := v_payload || jsonb_build_object(
      'nextAmountMinor', (v_current_amount * 2)::text
    );
  end if;

  perform public.enqueue_email_outbox(
    p_user_id,
    v_email,
    'FINE_NOTIFICATION',
    v_payload,
    'email:' || p_idempotency_key
  );

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

create or replace function public.invite_team_member(
  p_team_id uuid,
  p_email text,
  p_role public.invitation_role
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
  v_invitation_id uuid;
  v_team_name text;
  v_existing_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  if not public.is_team_staff(p_team_id) then
    raise exception 'TEAM_STAFF_REQUIRED' using errcode = '42501';
  end if;

  if v_email = '' or position('@' in v_email) <= 1 then
    raise exception 'INVALID_EMAIL' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.profiles p
    join public.team_members tm on tm.user_id = p.id
    where tm.team_id = p_team_id
      and tm.status = 'ACTIVE'
      and lower(trim(p.email)) = v_email
  ) then
    raise exception 'ALREADY_MEMBER' using errcode = '23505';
  end if;

  update public.team_invitations
  set status = 'EXPIRED'
  where team_id = p_team_id
    and email_normalized = v_email
    and status = 'PENDING'
    and expires_at <= now();

  if exists (
    select 1
    from public.team_invitations i
    where i.team_id = p_team_id
      and i.email_normalized = v_email
      and i.status = 'PENDING'
  ) then
    raise exception 'INVITATION_ALREADY_PENDING' using errcode = '23505';
  end if;

  insert into public.team_invitations(
    team_id,
    email_normalized,
    role,
    invited_by
  )
  values (
    p_team_id,
    v_email,
    p_role,
    auth.uid()
  )
  returning id into v_invitation_id;

  select t.name
  into v_team_name
  from public.teams t
  where t.id = p_team_id;

  select p.id
  into v_existing_user_id
  from public.profiles p
  where lower(trim(p.email)) = v_email
  order by p.created_at, p.id
  limit 1;

  perform public.enqueue_email_outbox(
    v_existing_user_id,
    v_email,
    'TEAM_INVITATION',
    jsonb_build_object(
      'teamName', v_team_name,
      'role', p_role::text
    ),
    'team-invite:' || v_invitation_id::text || ':1'
  );

  return v_invitation_id;
end;
$$;

revoke execute on function public.invite_team_member(
  uuid,
  text,
  public.invitation_role
) from public, anon;
grant execute on function public.invite_team_member(
  uuid,
  text,
  public.invitation_role
) to authenticated;
