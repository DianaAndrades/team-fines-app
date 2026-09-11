create or replace function public.claim_email_outbox(p_limit integer)
returns table (
  id uuid,
  recipient_email text,
  template_key text,
  payload jsonb,
  idempotency_key text,
  attempt_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 500 then
    raise exception 'INVALID_EMAIL_CLAIM_LIMIT' using errcode = '22023';
  end if;

  return query
  with candidates as (
    select e.id
    from public.email_outbox e
    where (
      e.status in ('PENDING', 'FAILED')
      and e.next_attempt_at <= now()
    ) or (
      e.status = 'SENDING'
      and e.locked_at is not null
      and e.locked_at <= now() - interval '10 minutes'
    )
    order by e.next_attempt_at, e.created_at, e.id
    for update skip locked
    limit p_limit
  ),
  claimed as (
    update public.email_outbox e
    set
      status = 'SENDING',
      locked_at = now(),
      attempt_count = e.attempt_count + 1
    from candidates c
    where e.id = c.id
    returning
      e.id,
      e.recipient_email,
      e.template_key,
      e.payload,
      e.idempotency_key,
      e.attempt_count
  )
  select
    c.id,
    c.recipient_email,
    c.template_key,
    c.payload,
    c.idempotency_key,
    c.attempt_count
  from claimed c;
end;
$$;

create or replace function public.complete_email_outbox(
  p_email_id uuid,
  p_attempt_count integer,
  p_provider_message_id text
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.email_outbox e
  set
    status = 'SENT',
    provider_message_id = p_provider_message_id,
    sent_at = now(),
    locked_at = null,
    last_error = null
  where e.id = p_email_id
    and e.status = 'SENDING'
    and e.attempt_count = p_attempt_count;
$$;

create or replace function public.fail_email_outbox(
  p_email_id uuid,
  p_attempt_count integer,
  p_error text
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.email_outbox e
  set
    status = 'FAILED',
    last_error = p_error,
    locked_at = null,
    next_attempt_at = now() + least(
      interval '6 hours',
      interval '5 minutes' * power(
        2::double precision,
        least(greatest(e.attempt_count - 1, 0), 20)
      )
    )
  where e.id = p_email_id
    and e.status = 'SENDING'
    and e.attempt_count = p_attempt_count;
$$;

revoke execute on function public.claim_email_outbox(integer) from public, anon, authenticated;
revoke execute on function public.complete_email_outbox(uuid, integer, text) from public, anon, authenticated;
revoke execute on function public.fail_email_outbox(uuid, integer, text) from public, anon, authenticated;

grant execute on function public.claim_email_outbox(integer) to service_role;
grant execute on function public.complete_email_outbox(uuid, integer, text) to service_role;
grant execute on function public.fail_email_outbox(uuid, integer, text) to service_role;
