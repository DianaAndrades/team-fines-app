begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

insert into auth.users (id, email)
values
  ('30000000-0000-0000-0000-0000000000a1', 'coach-a@fines.test'),
  ('30000000-0000-0000-0000-0000000000a2', 'player-a@fines.test'),
  ('30000000-0000-0000-0000-0000000000a3', 'player2-a@fines.test'),
  ('30000000-0000-0000-0000-0000000000b1', 'coach-b@fines.test'),
  ('30000000-0000-0000-0000-0000000000b2', 'player-b@fines.test');

insert into public.profiles (id, email)
values
  ('30000000-0000-0000-0000-0000000000a1', 'coach-a@fines.test'),
  ('30000000-0000-0000-0000-0000000000a2', 'player-a@fines.test'),
  ('30000000-0000-0000-0000-0000000000a3', 'player2-a@fines.test'),
  ('30000000-0000-0000-0000-0000000000b1', 'coach-b@fines.test'),
  ('30000000-0000-0000-0000-0000000000b2', 'player-b@fines.test')
on conflict (id) do nothing;

insert into public.teams (id, name, currency_code)
values
  ('31000000-0000-0000-0000-0000000000a1', 'Fine Team A', 'EUR'),
  ('31000000-0000-0000-0000-0000000000b1', 'Fine Team B', 'GBP');

insert into public.seasons (id, team_id, name, is_active)
values
  ('32000000-0000-0000-0000-0000000000a1', '31000000-0000-0000-0000-0000000000a1', '2026/27', true),
  ('32000000-0000-0000-0000-0000000000b1', '31000000-0000-0000-0000-0000000000b1', '2026/27', true);

insert into public.team_members (id, team_id, user_id, role, status)
values
  ('33000000-0000-0000-0000-0000000000a1', '31000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a1', 'COACH', 'ACTIVE'),
  ('33000000-0000-0000-0000-0000000000a2', '31000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a2', 'PLAYER', 'ACTIVE'),
  ('33000000-0000-0000-0000-0000000000a3', '31000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a3', 'PLAYER', 'ACTIVE'),
  ('33000000-0000-0000-0000-0000000000b1', '31000000-0000-0000-0000-0000000000b1', '30000000-0000-0000-0000-0000000000b1', 'COACH', 'ACTIVE'),
  ('33000000-0000-0000-0000-0000000000b2', '31000000-0000-0000-0000-0000000000b1', '30000000-0000-0000-0000-0000000000b2', 'PLAYER', 'ACTIVE');

insert into public.season_members (season_id, team_member_id)
values
  ('32000000-0000-0000-0000-0000000000a1', '33000000-0000-0000-0000-0000000000a1'),
  ('32000000-0000-0000-0000-0000000000a1', '33000000-0000-0000-0000-0000000000a2'),
  ('32000000-0000-0000-0000-0000000000a1', '33000000-0000-0000-0000-0000000000a3'),
  ('32000000-0000-0000-0000-0000000000b1', '33000000-0000-0000-0000-0000000000b1'),
  ('32000000-0000-0000-0000-0000000000b1', '33000000-0000-0000-0000-0000000000b2');

insert into public.rules (
  id, team_id, season_id, title, description, default_amount_minor, is_active, created_by
)
values
  ('34000000-0000-0000-0000-0000000000a1', '31000000-0000-0000-0000-0000000000a1', '32000000-0000-0000-0000-0000000000a1', 'Late to training', null, 500, true, '30000000-0000-0000-0000-0000000000a1'),
  ('34000000-0000-0000-0000-0000000000a2', '31000000-0000-0000-0000-0000000000a1', '32000000-0000-0000-0000-0000000000a1', 'Retired rule', null, 300, false, '30000000-0000-0000-0000-0000000000a1');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-0000000000a2', true);
select set_config('request.jwt.claims', '{"sub":"30000000-0000-0000-0000-0000000000a2","role":"authenticated","email":"player-a@fines.test"}', true);
select throws_ok(
  $$select public.create_fine(
    '31000000-0000-0000-0000-0000000000a1',
    '33000000-0000-0000-0000-0000000000a2',
    '34000000-0000-0000-0000-0000000000a1',
    null,
    null
  )$$,
  '42501',
  'INSUFFICIENT_PERMISSION',
  'PLAYER cannot create a fine'
);

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-0000000000a1', true);
select set_config('request.jwt.claims', '{"sub":"30000000-0000-0000-0000-0000000000a1","role":"authenticated","email":"coach-a@fines.test"}', true);

select throws_ok(
  $$select public.create_fine(
    '31000000-0000-0000-0000-0000000000a1',
    '33000000-0000-0000-0000-0000000000b2',
    '34000000-0000-0000-0000-0000000000a1',
    null,
    null
  )$$,
  '22023',
  'INVALID_PLAYER',
  'COACH cannot fine a member from another team'
);

select throws_ok(
  $$select public.create_fine(
    '31000000-0000-0000-0000-0000000000a1',
    '33000000-0000-0000-0000-0000000000a2',
    '34000000-0000-0000-0000-0000000000a2',
    null,
    null
  )$$,
  '22023',
  'INVALID_RULE',
  'Inactive rule cannot create a new fine'
);

select throws_ok(
  $$select public.create_fine(
    '31000000-0000-0000-0000-0000000000a1',
    '33000000-0000-0000-0000-0000000000a2',
    null,
    'Bad custom fine',
    10.5
  )$$,
  '22023',
  'INVALID_CUSTOM_FINE',
  'Custom fine requires a positive integer amount'
);

select lives_ok(
  $$select public.create_fine(
    '31000000-0000-0000-0000-0000000000a1',
    '33000000-0000-0000-0000-0000000000a2',
    '34000000-0000-0000-0000-0000000000a1',
    null,
    null
  )$$,
  'COACH can create a rule-based fine for an active player'
);

select ok(
  exists (
    select 1
    from public.fines
    where team_id = '31000000-0000-0000-0000-0000000000a1'
      and player_team_member_id = '33000000-0000-0000-0000-0000000000a2'
      and source_rule_id = '34000000-0000-0000-0000-0000000000a1'
      and reason_snapshot = 'Late to training'
      and original_amount_minor = 500
      and current_amount_minor = 500
      and status = 'PENDING'
  ),
  'Rule fine snapshots title and amount'
);

select ok(
  exists (
    select 1
    from public.fines
    where source_rule_id = '34000000-0000-0000-0000-0000000000a1'
      and next_doubling_at = created_at + interval '7 days'
  ),
  'New fine deadline is exactly seven days after creation'
);

select is(
  (
    select count(*)::integer
    from public.fine_events e
    join public.fines f on f.id = e.fine_id
    where f.source_rule_id = '34000000-0000-0000-0000-0000000000a1'
      and e.type = 'CREATED'
  ),
  1,
  'Creation writes exactly one CREATED event'
);

select is(
  (
    select count(*)::integer
    from public.fine_season_links l
    join public.fines f on f.id = l.fine_id
    where f.source_rule_id = '34000000-0000-0000-0000-0000000000a1'
      and l.season_id = '32000000-0000-0000-0000-0000000000a1'
      and l.link_type = 'ORIGIN'
  ),
  1,
  'Creation writes one ORIGIN season link'
);

select lives_ok(
  $$select public.create_fine(
    '31000000-0000-0000-0000-0000000000a1',
    '33000000-0000-0000-0000-0000000000a3',
    null,
    'Boots left at home',
    700
  )$$,
  'COACH can create a valid custom fine'
);

select lives_ok(
  $$select public.adjust_fine_amount(
    (select id from public.fines where reason_snapshot = 'Boots left at home'),
    900,
    'Coach corrected the amount'
  )$$,
  'COACH can adjust a pending fine'
);

select is(
  (select current_amount_minor::text from public.fines where reason_snapshot = 'Boots left at home'),
  '900',
  'Adjustment changes current amount'
);

select ok(
  exists (
    select 1
    from public.fine_events e
    join public.fines f on f.id = e.fine_id
    where f.reason_snapshot = 'Boots left at home'
      and e.type = 'AMOUNT_ADJUSTED'
      and e.previous_amount_minor = 700
      and e.new_amount_minor = 900
      and e.metadata ->> 'reason' = 'Coach corrected the amount'
  ),
  'Adjustment event stores previous/new amount and reason'
);

select lives_ok(
  $$select public.mark_fine_paid(
    (select id from public.fines where reason_snapshot = 'Boots left at home')
  )$$,
  'COACH can mark a pending fine paid'
);

select ok(
  exists (
    select 1
    from public.fines f
    where f.reason_snapshot = 'Boots left at home'
      and f.status = 'PAID'
      and f.next_doubling_at is null
      and f.paid_at is not null
      and f.paid_by = '30000000-0000-0000-0000-0000000000a1'
      and exists (
        select 1 from public.fine_events e
        where e.fine_id = f.id and e.type = 'PAID'
      )
  ),
  'Payment clears deadline, stores actor/time, and writes PAID event'
);

select throws_ok(
  $$select public.mark_fine_paid(
    (select id from public.fines where reason_snapshot = 'Boots left at home')
  )$$,
  '22023',
  'INVALID_FINE_STATE',
  'PAID fine cannot be paid twice'
);

select lives_ok(
  $$select public.cancel_fine(
    (select id from public.fines where source_rule_id = '34000000-0000-0000-0000-0000000000a1'),
    'Training was cancelled'
  )$$,
  'COACH can cancel a pending fine'
);

select ok(
  exists (
    select 1
    from public.fines f
    where f.source_rule_id = '34000000-0000-0000-0000-0000000000a1'
      and f.status = 'CANCELLED'
      and f.next_doubling_at is null
      and f.cancelled_at is not null
      and f.cancelled_by = '30000000-0000-0000-0000-0000000000a1'
      and f.cancellation_reason = 'Training was cancelled'
      and exists (
        select 1 from public.fine_events e
        where e.fine_id = f.id
          and e.type = 'CANCELLED'
          and e.metadata ->> 'reason' = 'Training was cancelled'
      )
  ),
  'Cancellation clears deadline and writes audit data'
);

select * from finish();
rollback;
