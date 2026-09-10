begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

insert into auth.users (id, email)
values
  ('40000000-0000-0000-0000-000000000001', 'coach@disputes.test'),
  ('40000000-0000-0000-0000-000000000002', 'player@disputes.test'),
  ('40000000-0000-0000-0000-000000000003', 'other@disputes.test');

insert into public.profiles (id, email)
values
  ('40000000-0000-0000-0000-000000000001', 'coach@disputes.test'),
  ('40000000-0000-0000-0000-000000000002', 'player@disputes.test'),
  ('40000000-0000-0000-0000-000000000003', 'other@disputes.test')
on conflict (id) do nothing;

insert into public.teams (id, name, currency_code)
values ('41000000-0000-0000-0000-000000000001', 'Dispute FC', 'EUR');

insert into public.seasons (id, team_id, name, is_active)
values ('42000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001', '2026/27', true);

insert into public.team_members (id, team_id, user_id, role, status)
values
  ('43000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'COACH', 'ACTIVE'),
  ('43000000-0000-0000-0000-000000000002', '41000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'PLAYER', 'ACTIVE'),
  ('43000000-0000-0000-0000-000000000003', '41000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', 'PLAYER', 'ACTIVE');

insert into public.season_members (season_id, team_member_id)
values
  ('42000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000001'),
  ('42000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000002'),
  ('42000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000003');

insert into public.fines (
  id, team_id, player_team_member_id, origin_season_id, reason_snapshot,
  original_amount_minor, current_amount_minor, status, created_by, created_at, next_doubling_at
)
values
  (
    '44000000-0000-0000-0000-000000000001',
    '41000000-0000-0000-0000-000000000001',
    '43000000-0000-0000-0000-000000000002',
    '42000000-0000-0000-0000-000000000001',
    'Late to training', 500, 500, 'PENDING',
    '40000000-0000-0000-0000-000000000001', now() - interval '4 days', now() + interval '3 days'
  ),
  (
    '44000000-0000-0000-0000-000000000002',
    '41000000-0000-0000-0000-000000000001',
    '43000000-0000-0000-0000-000000000002',
    '42000000-0000-0000-0000-000000000001',
    'Forgot the bibs', 700, 700, 'PENDING',
    '40000000-0000-0000-0000-000000000001', now() - interval '2 days', now() + interval '5 days'
  ),
  (
    '44000000-0000-0000-0000-000000000003',
    '41000000-0000-0000-0000-000000000001',
    '43000000-0000-0000-0000-000000000002',
    '42000000-0000-0000-0000-000000000001',
    'Overdue fine', 500, 500, 'PENDING',
    '40000000-0000-0000-0000-000000000001', now() - interval '7 days 1 second', now() - interval '1 second'
  );

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

select has_function('public', 'open_fine_dispute', array['uuid', 'text'], 'open dispute RPC exists');
select has_function('public', 'accept_fine_dispute', array['uuid', 'text'], 'accept dispute RPC exists');
select has_function('public', 'reject_fine_dispute', array['uuid', 'text'], 'reject dispute RPC exists');

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"40000000-0000-0000-0000-000000000003","role":"authenticated","email":"other@disputes.test"}', true);
select throws_ok(
  $$select public.open_fine_dispute('44000000-0000-0000-0000-000000000001', 'I was on time')$$,
  '42501',
  'INSUFFICIENT_PERMISSION',
  'another player cannot dispute somebody else''s fine'
);

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"40000000-0000-0000-0000-000000000002","role":"authenticated","email":"player@disputes.test"}', true);
select lives_ok(
  $$select public.open_fine_dispute('44000000-0000-0000-0000-000000000001', 'Training started later than scheduled')$$,
  'the fined player can dispute a pending fine'
);

select ok(
  exists (
    select 1 from public.fines
    where id = '44000000-0000-0000-0000-000000000001'
      and status = 'DISPUTED'
      and next_doubling_at is null
      and dispute_remaining_seconds = 259200
      and dispute_reason = 'Training started later than scheduled'
      and disputed_by = '40000000-0000-0000-0000-000000000002'
      and disputed_at is not null
  ),
  'opening a dispute freezes the exact remaining timer and stores its reason'
);

select ok(
  exists (
    select 1 from public.fine_events
    where fine_id = '44000000-0000-0000-0000-000000000001'
      and type = 'DISPUTE_OPENED'
      and actor_user_id = '40000000-0000-0000-0000-000000000002'
      and metadata ->> 'reason' = 'Training started later than scheduled'
  ),
  'opening a dispute writes an audit event'
);

select throws_ok(
  $$select public.open_fine_dispute('44000000-0000-0000-0000-000000000001', 'Second attempt')$$,
  '22023',
  'INVALID_FINE_STATE',
  'a disputed fine cannot be disputed twice'
);

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"40000000-0000-0000-0000-000000000001","role":"authenticated","email":"coach@disputes.test"}', true);
select lives_ok(
  $$select public.reject_fine_dispute('44000000-0000-0000-0000-000000000001', 'Attendance log confirms the fine')$$,
  'staff can reject a dispute'
);

select ok(
  exists (
    select 1 from public.fines
    where id = '44000000-0000-0000-0000-000000000001'
      and status = 'PENDING'
      and next_doubling_at = now() + interval '3 days'
      and dispute_remaining_seconds is null
  ),
  'rejection resumes the exact remaining timer'
);

select ok(
  exists (
    select 1 from public.fine_events
    where fine_id = '44000000-0000-0000-0000-000000000001'
      and type = 'DISPUTE_REJECTED'
      and actor_user_id = '40000000-0000-0000-0000-000000000001'
      and metadata ->> 'reason' = 'Attendance log confirms the fine'
  ),
  'rejection writes an audit event with staff reason'
);

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"40000000-0000-0000-0000-000000000002","role":"authenticated","email":"player@disputes.test"}', true);
select lives_ok(
  $$select public.open_fine_dispute('44000000-0000-0000-0000-000000000002', 'The equipment was already in the car')$$,
  'player can open a second valid dispute'
);

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"40000000-0000-0000-0000-000000000001","role":"authenticated","email":"coach@disputes.test"}', true);
select lives_ok(
  $$select public.accept_fine_dispute('44000000-0000-0000-0000-000000000002', 'Player evidence accepted')$$,
  'staff can accept a dispute'
);

select ok(
  exists (
    select 1 from public.fines
    where id = '44000000-0000-0000-0000-000000000002'
      and status = 'CANCELLED'
      and next_doubling_at is null
      and dispute_remaining_seconds is null
      and cancelled_by = '40000000-0000-0000-0000-000000000001'
      and cancelled_at is not null
  ),
  'accepting a dispute cancels the fine'
);

select ok(
  exists (
    select 1 from public.fine_events
    where fine_id = '44000000-0000-0000-0000-000000000002'
      and type = 'DISPUTE_ACCEPTED'
      and actor_user_id = '40000000-0000-0000-0000-000000000001'
      and metadata ->> 'reason' = 'Player evidence accepted'
  ),
  'acceptance writes an audit event with staff reason'
);

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"40000000-0000-0000-0000-000000000002","role":"authenticated","email":"player@disputes.test"}', true);
select lives_ok(
  $$select public.open_fine_dispute('44000000-0000-0000-0000-000000000003', 'This deadline already passed')$$,
  'opening an overdue fine catches up doubling before freezing'
);

select is(
  (select current_amount_minor::text from public.fines where id = '44000000-0000-0000-0000-000000000003'),
  '1000',
  'an overdue fine doubles before the dispute is frozen'
);

select ok(
  exists (
    select 1 from public.fines
    where id = '44000000-0000-0000-0000-000000000003'
      and status = 'DISPUTED'
      and next_doubling_at is null
      and dispute_remaining_seconds = 604799
  ),
  'overdue dispute freezes the remaining time after catch-up'
);

select ok(
  exists (
    select 1 from public.fine_events
    where fine_id = '44000000-0000-0000-0000-000000000003'
      and type = 'DOUBLED'
      and previous_amount_minor = 500
      and new_amount_minor = 1000
      and scheduled_at = now() - interval '1 second'
  ),
  'deadline catch-up writes the scheduled DOUBLED event exactly once'
);

select * from finish();
rollback;
