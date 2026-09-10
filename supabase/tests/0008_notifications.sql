begin;

create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (id, email)
values
  ('70000000-0000-0000-0000-000000000001', 'owner@notifications.test'),
  ('70000000-0000-0000-0000-000000000002', 'player@notifications.test'),
  ('70000000-0000-0000-0000-000000000003', 'other@notifications.test');

insert into public.profiles (id, email, display_name)
values
  ('70000000-0000-0000-0000-000000000001', 'owner@notifications.test', 'Owner'),
  ('70000000-0000-0000-0000-000000000002', 'player@notifications.test', 'Alex'),
  ('70000000-0000-0000-0000-000000000003', 'other@notifications.test', 'Teammate')
on conflict (id) do nothing;

insert into public.teams (id, name, currency_code)
values ('71000000-0000-0000-0000-000000000001', 'Notifications FC', 'EUR');

insert into public.seasons (id, team_id, name, is_active)
values ('72000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', '2026/27', true);

insert into public.team_members (id, team_id, user_id, role, status)
values
  ('73000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'OWNER', 'ACTIVE'),
  ('73000000-0000-0000-0000-000000000002', '71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 'PLAYER', 'ACTIVE'),
  ('73000000-0000-0000-0000-000000000003', '71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000003', 'PLAYER', 'ACTIVE');

insert into public.season_members (season_id, team_member_id)
values
  ('72000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001'),
  ('72000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000002'),
  ('72000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000003');

select has_table('public', 'notifications', 'notifications table exists');
select has_function('public', 'process_due_reminders', array['timestamp with time zone', 'integer'], 'reminder processor exists');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"70000000-0000-0000-0000-000000000001","role":"authenticated","email":"owner@notifications.test"}', true);

select lives_ok(
  $$select public.create_fine(
    '71000000-0000-0000-0000-000000000001',
    '73000000-0000-0000-0000-000000000002',
    null,
    'Late to training',
    500
  )$$,
  'staff can create a fine that emits a notification'
);

select is(
  (select count(*)::integer from public.notifications where user_id = '70000000-0000-0000-0000-000000000002' and type = 'NEW_FINE'),
  1,
  'new fine creates exactly one notification for the fined player'
);

select ok(
  exists (
    select 1
    from public.notifications n
    join public.fines f on f.id = n.fine_id
    where n.user_id = '70000000-0000-0000-0000-000000000002'
      and n.type = 'NEW_FINE'
      and n.idempotency_key = 'new-fine:' || f.id::text
  ),
  'new-fine notification uses a stable fine idempotency key'
);

reset role;
update public.fines
set created_at = '2026-09-04 11:00:00+00',
    next_doubling_at = '2026-09-11 11:00:00+00'
where reason_snapshot = 'Late to training'
returning id;

set local role service_role;
select lives_ok(
  $$select * from public.process_due_reminders('2026-09-10 12:00:00+00'::timestamptz, 500)$$,
  'reminder processor runs inside the final 24 hours'
);
select lives_ok(
  $$select * from public.process_due_reminders('2026-09-10 13:00:00+00'::timestamptz, 500)$$,
  'repeated reminder processing is safe'
);

select is(
  (select count(*)::integer from public.notifications where user_id = '70000000-0000-0000-0000-000000000002' and type = 'DOUBLING_REMINDER'),
  1,
  'the same fine deadline produces only one reminder'
);

select lives_ok(
  $$select * from public.process_due_fines('2026-09-11 11:00:00+00'::timestamptz, 200)$$,
  'escalation advances the fine to its next weekly deadline'
);

select is(
  (select count(*)::integer from public.notifications where user_id = '70000000-0000-0000-0000-000000000002' and type = 'FINE_DOUBLED'),
  1,
  'successful doubling creates one in-app notification'
);

select lives_ok(
  $$select * from public.process_due_reminders('2026-09-17 12:00:00+00'::timestamptz, 500)$$,
  'the next weekly deadline may create a new reminder'
);

select is(
  (select count(*)::integer from public.notifications where user_id = '70000000-0000-0000-0000-000000000002' and type = 'DOUBLING_REMINDER'),
  2,
  'a later deadline gets its own reminder idempotency key'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"70000000-0000-0000-0000-000000000001","role":"authenticated","email":"owner@notifications.test"}', true);

select lives_ok(
  $$select public.mark_fine_paid((select id from public.fines where reason_snapshot = 'Late to training'))$$,
  'staff can mark the fine paid'
);

select is(
  (select count(*)::integer from public.notifications where user_id = '70000000-0000-0000-0000-000000000002' and type = 'FINE_PAID'),
  1,
  'payment creates one notification for the fined player'
);

select public.create_fine(
  '71000000-0000-0000-0000-000000000001',
  '73000000-0000-0000-0000-000000000002',
  null,
  'Forgot the bibs',
  700
);

select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"70000000-0000-0000-0000-000000000002","role":"authenticated","email":"player@notifications.test"}', true);
select public.open_fine_dispute(
  (select id from public.fines where reason_snapshot = 'Forgot the bibs'),
  'The equipment was already in the car'
);

select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"70000000-0000-0000-0000-000000000001","role":"authenticated","email":"owner@notifications.test"}', true);
select lives_ok(
  $$select public.reject_fine_dispute(
    (select id from public.fines where reason_snapshot = 'Forgot the bibs'),
    'Attendance log confirms the fine'
  )$$,
  'staff can resolve the dispute'
);

select is(
  (select count(*)::integer from public.notifications where user_id = '70000000-0000-0000-0000-000000000002' and type = 'DISPUTE_RESOLVED'),
  1,
  'dispute resolution creates one notification for the player'
);

select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"70000000-0000-0000-0000-000000000002","role":"authenticated","email":"player@notifications.test"}', true);

select ok(
  (select count(*) from public.notifications) >= 1,
  'player can read their own personal notifications'
);

select lives_ok(
  $$update public.notifications
    set read_at = now()
    where id = (select id from public.notifications order by created_at desc limit 1)$$,
  'player can mark an own notification read'
);

select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"70000000-0000-0000-0000-000000000003","role":"authenticated","email":"other@notifications.test"}', true);

select is(
  (select count(*)::integer from public.notifications),
  0,
  'another team member cannot read the player personal notifications'
);

select is(
  (
    with changed as (
      update public.notifications
      set read_at = now()
      returning id
    )
    select count(*)::integer from changed
  ),
  0,
  'another team member cannot mark those notifications read'
);

select * from finish();
rollback;
