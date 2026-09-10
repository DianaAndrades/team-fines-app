begin;

create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id, email)
values ('60000000-0000-0000-0000-000000000001', 'coach@escalation.test');

insert into public.profiles (id, email)
values ('60000000-0000-0000-0000-000000000001', 'coach@escalation.test')
on conflict (id) do nothing;

insert into public.teams (id, name, currency_code)
values ('61000000-0000-0000-0000-000000000001', 'Escalation FC', 'EUR');

insert into public.seasons (id, team_id, name, is_active)
values ('62000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001', '2026/27', true);

insert into public.team_members (id, team_id, user_id, role, status)
values (
  '63000000-0000-0000-0000-000000000001',
  '61000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001',
  'COACH',
  'ACTIVE'
);

insert into public.fines (
  id, team_id, player_team_member_id, origin_season_id, reason_snapshot,
  original_amount_minor, current_amount_minor, status, created_by, created_at,
  next_doubling_at, paid_at, paid_by, cancelled_at, cancelled_by, cancellation_reason,
  dispute_reason, disputed_at, disputed_by, dispute_remaining_seconds
)
values
  (
    '64000000-0000-0000-0000-000000000001',
    '61000000-0000-0000-0000-000000000001',
    '63000000-0000-0000-0000-000000000001',
    '62000000-0000-0000-0000-000000000001',
    'Not due yet', 500, 500, 'PENDING',
    '60000000-0000-0000-0000-000000000001', '2026-09-03 12:00:01+00',
    '2026-09-10 12:00:01+00', null, null, null, null, null,
    null, null, null, null
  ),
  (
    '64000000-0000-0000-0000-000000000002',
    '61000000-0000-0000-0000-000000000001',
    '63000000-0000-0000-0000-000000000001',
    '62000000-0000-0000-0000-000000000001',
    'Exactly due', 500, 500, 'PENDING',
    '60000000-0000-0000-0000-000000000001', '2026-09-03 12:00:00+00',
    '2026-09-10 12:00:00+00', null, null, null, null, null,
    null, null, null, null
  ),
  (
    '64000000-0000-0000-0000-000000000003',
    '61000000-0000-0000-0000-000000000001',
    '63000000-0000-0000-0000-000000000001',
    '62000000-0000-0000-0000-000000000001',
    'Two missed intervals', 500, 500, 'PENDING',
    '60000000-0000-0000-0000-000000000001', '2026-08-27 12:00:00+00',
    '2026-09-03 12:00:00+00', null, null, null, null, null,
    null, null, null, null
  ),
  (
    '64000000-0000-0000-0000-000000000004',
    '61000000-0000-0000-0000-000000000001',
    '63000000-0000-0000-0000-000000000001',
    '62000000-0000-0000-0000-000000000001',
    'Three missed intervals', 500, 500, 'PENDING',
    '60000000-0000-0000-0000-000000000001', '2026-08-20 12:00:00+00',
    '2026-08-27 12:00:00+00', null, null, null, null, null,
    null, null, null, null
  ),
  (
    '64000000-0000-0000-0000-000000000005',
    '61000000-0000-0000-0000-000000000001',
    '63000000-0000-0000-0000-000000000001',
    '62000000-0000-0000-0000-000000000001',
    'Already paid', 500, 500, 'PAID',
    '60000000-0000-0000-0000-000000000001', '2026-08-01 12:00:00+00',
    null, '2026-09-01 12:00:00+00', '60000000-0000-0000-0000-000000000001', null, null, null,
    null, null, null, null
  ),
  (
    '64000000-0000-0000-0000-000000000006',
    '61000000-0000-0000-0000-000000000001',
    '63000000-0000-0000-0000-000000000001',
    '62000000-0000-0000-0000-000000000001',
    'Cancelled fine', 500, 500, 'CANCELLED',
    '60000000-0000-0000-0000-000000000001', '2026-08-01 12:00:00+00',
    null, null, null, '2026-09-01 12:00:00+00', '60000000-0000-0000-0000-000000000001', 'Cancelled',
    null, null, null, null
  ),
  (
    '64000000-0000-0000-0000-000000000007',
    '61000000-0000-0000-0000-000000000001',
    '63000000-0000-0000-0000-000000000001',
    '62000000-0000-0000-0000-000000000001',
    'Disputed fine', 500, 500, 'DISPUTED',
    '60000000-0000-0000-0000-000000000001', '2026-08-01 12:00:00+00',
    null, null, null, null, null, null,
    'Under review', '2026-09-09 12:00:00+00', '60000000-0000-0000-0000-000000000001', 86400
  );

select has_function(
  'public',
  'process_due_fines',
  array['timestamp with time zone', 'integer'],
  'service escalation RPC exists'
);

set local role service_role;

select lives_ok(
  $$select * from public.process_due_fines('2026-09-10 12:00:00+00'::timestamptz, 200)$$,
  'processor runs at an explicit UTC timestamp'
);

select is(
  (select current_amount_minor::text from public.fines where id = '64000000-0000-0000-0000-000000000001'),
  '500',
  'a fine one second before its deadline does not double'
);

select is(
  (select current_amount_minor::text from public.fines where id = '64000000-0000-0000-0000-000000000002'),
  '1000',
  'a fine exactly at its deadline doubles once'
);

select is(
  (select next_doubling_at::text from public.fines where id = '64000000-0000-0000-0000-000000000002'),
  '2026-09-17 12:00:00+00',
  'next deadline advances from the scheduled deadline, not processor execution time'
);

select is(
  (select current_amount_minor::text from public.fines where id = '64000000-0000-0000-0000-000000000003'),
  '2000',
  'two due intervals are caught up in order'
);

select is(
  (select count(*)::integer from public.fine_events where fine_id = '64000000-0000-0000-0000-000000000003' and type = 'DOUBLED'),
  2,
  'two missed intervals persist two scheduled doubling events'
);

select is(
  (select current_amount_minor::text from public.fines where id = '64000000-0000-0000-0000-000000000004'),
  '4000',
  'three due intervals produce 500 -> 1000 -> 2000 -> 4000'
);

select is(
  (select count(*)::integer from public.fine_events where fine_id = '64000000-0000-0000-0000-000000000004' and type = 'DOUBLED'),
  3,
  'three missed intervals persist three unique scheduled events'
);

select is(
  (select sum(current_amount_minor)::text from public.fines where id in (
    '64000000-0000-0000-0000-000000000005',
    '64000000-0000-0000-0000-000000000006',
    '64000000-0000-0000-0000-000000000007'
  )),
  '1500',
  'paid, cancelled and disputed fines are ignored'
);

select lives_ok(
  $$select * from public.process_due_fines('2026-09-10 12:00:00+00'::timestamptz, 200)$$,
  'rerunning at the same timestamp is safe'
);

select is(
  (select current_amount_minor::text from public.fines where id = '64000000-0000-0000-0000-000000000004'),
  '4000',
  'rerunning does not apply an already persisted scheduled occurrence twice'
);

select is(
  (select count(*)::integer from public.fine_events where type = 'DOUBLED' and fine_id in (
    '64000000-0000-0000-0000-000000000002',
    '64000000-0000-0000-0000-000000000003',
    '64000000-0000-0000-0000-000000000004'
  )),
  6,
  'rerunning does not duplicate scheduled doubling events'
);

select * from finish();
rollback;
