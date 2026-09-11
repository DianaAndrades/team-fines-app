begin;

create extension if not exists pgtap with schema extensions;
select plan(17);

insert into public.email_outbox (
  id,
  recipient_email,
  template_key,
  payload,
  idempotency_key,
  status,
  attempt_count,
  next_attempt_at,
  locked_at,
  created_at
)
values
  (
    '90000000-0000-0000-0000-000000000001',
    'pending@example.com',
    'TEAM_INVITATION',
    '{"teamName":"Sunday XI","role":"PLAYER"}',
    'delivery:pending',
    'PENDING',
    0,
    now() - interval '1 minute',
    null,
    now() - interval '6 minutes'
  ),
  (
    '90000000-0000-0000-0000-000000000002',
    'future@example.com',
    'TEAM_INVITATION',
    '{"teamName":"Sunday XI","role":"PLAYER"}',
    'delivery:future',
    'PENDING',
    0,
    now() + interval '1 hour',
    null,
    now() - interval '5 minutes'
  ),
  (
    '90000000-0000-0000-0000-000000000003',
    'failed@example.com',
    'TEAM_INVITATION',
    '{"teamName":"Sunday XI","role":"COACH"}',
    'delivery:failed',
    'FAILED',
    2,
    now() - interval '1 minute',
    null,
    now() - interval '4 minutes'
  ),
  (
    '90000000-0000-0000-0000-000000000004',
    'stale@example.com',
    'TEAM_INVITATION',
    '{"teamName":"Sunday XI","role":"PLAYER"}',
    'delivery:stale',
    'SENDING',
    1,
    now() - interval '20 minutes',
    now() - interval '11 minutes',
    now() - interval '3 minutes'
  ),
  (
    '90000000-0000-0000-0000-000000000005',
    'fresh@example.com',
    'TEAM_INVITATION',
    '{"teamName":"Sunday XI","role":"PLAYER"}',
    'delivery:fresh',
    'SENDING',
    1,
    now() - interval '20 minutes',
    now() - interval '5 minutes',
    now() - interval '2 minutes'
  ),
  (
    '90000000-0000-0000-0000-000000000006',
    'capped@example.com',
    'TEAM_INVITATION',
    '{"teamName":"Sunday XI","role":"PLAYER"}',
    'delivery:capped',
    'FAILED',
    20,
    now() - interval '1 minute',
    null,
    now() - interval '1 minute'
  );

set local role service_role;

select lives_ok(
  $$select set_config(
    'test.email_claim_count',
    (select count(*)::text from public.claim_email_outbox(10)),
    true
  )$$,
  'service worker can atomically claim due email rows'
);

select is(
  coalesce(current_setting('test.email_claim_count', true), '0')::integer,
  4,
  'claim picks due pending, due failed, stale sending and high-attempt failed rows'
);

select ok(
  exists (
    select 1 from public.email_outbox
    where id = '90000000-0000-0000-0000-000000000001'
      and status = 'SENDING'
      and attempt_count = 1
      and locked_at is not null
  ),
  'claim marks a pending row sending and increments its attempt'
);

select ok(
  exists (
    select 1 from public.email_outbox
    where id = '90000000-0000-0000-0000-000000000003'
      and status = 'SENDING'
      and attempt_count = 3
      and locked_at is not null
  ),
  'claim retries a due failed row and increments its attempt'
);

select ok(
  exists (
    select 1 from public.email_outbox
    where id = '90000000-0000-0000-0000-000000000004'
      and status = 'SENDING'
      and attempt_count = 2
      and locked_at > now() - interval '1 minute'
  ),
  'claim recovers a sending row whose lock is older than ten minutes'
);

select ok(
  exists (
    select 1 from public.email_outbox
    where id = '90000000-0000-0000-0000-000000000002'
      and status = 'PENDING'
      and attempt_count = 0
  ),
  'claim ignores a pending row whose next attempt is in the future'
);

select ok(
  exists (
    select 1 from public.email_outbox
    where id = '90000000-0000-0000-0000-000000000005'
      and status = 'SENDING'
      and attempt_count = 1
      and locked_at <= now() - interval '5 minutes'
  ),
  'claim does not steal a fresh sending lock'
);

select is(
  (select count(*)::integer from public.claim_email_outbox(10)),
  0,
  'an overlapping worker cannot immediately reclaim the rows just claimed'
);

select ok(
  coalesce(
    (
      select position('skip locked' in lower(pg_get_functiondef(p.oid))) > 0
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'claim_email_outbox'
      limit 1
    ),
    false
  ),
  'claim implementation uses SKIP LOCKED for overlapping workers'
);

select lives_ok(
  $$select public.complete_email_outbox(
    '90000000-0000-0000-0000-000000000001',
    1,
    'provider-123'
  )$$,
  'the current claim can be completed'
);

select ok(
  exists (
    select 1 from public.email_outbox
    where id = '90000000-0000-0000-0000-000000000001'
      and status = 'SENT'
      and provider_message_id = 'provider-123'
      and sent_at is not null
      and locked_at is null
  ),
  'completion records provider id, sent timestamp and clears the lock'
);

select lives_ok(
  $$select public.complete_email_outbox(
    '90000000-0000-0000-0000-000000000004',
    1,
    'stale-provider'
  )$$,
  'a stale worker completion is safely ignored'
);

select ok(
  exists (
    select 1 from public.email_outbox
    where id = '90000000-0000-0000-0000-000000000004'
      and status = 'SENDING'
      and attempt_count = 2
      and provider_message_id is null
  ),
  'an old attempt cannot overwrite a newer claim'
);

select lives_ok(
  $$select public.fail_email_outbox(
    '90000000-0000-0000-0000-000000000003',
    3,
    'provider unavailable'
  )$$,
  'the current claim can be marked failed'
);

select ok(
  exists (
    select 1 from public.email_outbox
    where id = '90000000-0000-0000-0000-000000000003'
      and status = 'FAILED'
      and last_error = 'provider unavailable'
      and locked_at is null
      and next_attempt_at > now()
      and next_attempt_at <= now() + interval '6 hours'
  ),
  'failure remains retryable with exponential backoff capped at six hours'
);

select lives_ok(
  $$select public.fail_email_outbox(
    '90000000-0000-0000-0000-000000000006',
    21,
    'still unavailable'
  )$$,
  'a high-attempt claim can be marked failed'
);

select ok(
  exists (
    select 1 from public.email_outbox
    where id = '90000000-0000-0000-0000-000000000006'
      and status = 'FAILED'
      and next_attempt_at between now() + interval '5 hours 59 minutes 59 seconds'
                              and now() + interval '6 hours 1 second'
  ),
  'retry backoff is capped at six hours'
);

select * from finish();
rollback;
