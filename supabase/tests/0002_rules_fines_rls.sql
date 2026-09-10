begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

insert into auth.users (id, email)
values
  ('20000000-0000-0000-0000-0000000000a1', 'owner-a@rules.test'),
  ('20000000-0000-0000-0000-0000000000a2', 'player-a@rules.test'),
  ('20000000-0000-0000-0000-0000000000a3', 'coach-a@rules.test'),
  ('20000000-0000-0000-0000-0000000000b1', 'owner-b@rules.test'),
  ('20000000-0000-0000-0000-0000000000b2', 'player-b@rules.test');

insert into public.teams (id, name, currency_code)
values
  ('21000000-0000-0000-0000-0000000000a1', 'Rules Team A', 'EUR'),
  ('21000000-0000-0000-0000-0000000000b1', 'Rules Team B', 'GBP');

insert into public.seasons (id, team_id, name, is_active)
values
  ('22000000-0000-0000-0000-0000000000a1', '21000000-0000-0000-0000-0000000000a1', '2026/27', true),
  ('22000000-0000-0000-0000-0000000000b1', '21000000-0000-0000-0000-0000000000b1', '2026/27', true);

insert into public.team_members (id, team_id, user_id, role)
values
  ('23000000-0000-0000-0000-0000000000a1', '21000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1', 'OWNER'),
  ('23000000-0000-0000-0000-0000000000a2', '21000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a2', 'PLAYER'),
  ('23000000-0000-0000-0000-0000000000a3', '21000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a3', 'COACH'),
  ('23000000-0000-0000-0000-0000000000b1', '21000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-0000000000b1', 'OWNER'),
  ('23000000-0000-0000-0000-0000000000b2', '21000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-0000000000b2', 'PLAYER');

insert into public.rules (
  id, team_id, season_id, title, default_amount_minor, created_by
)
values
  ('24000000-0000-0000-0000-0000000000a1', '21000000-0000-0000-0000-0000000000a1', '22000000-0000-0000-0000-0000000000a1', 'Late to training', 500, '20000000-0000-0000-0000-0000000000a1'),
  ('24000000-0000-0000-0000-0000000000b1', '21000000-0000-0000-0000-0000000000b1', '22000000-0000-0000-0000-0000000000b1', 'Forgot kit', 300, '20000000-0000-0000-0000-0000000000b1');

insert into public.fines (
  id, team_id, player_team_member_id, origin_season_id, source_rule_id,
  reason_snapshot, original_amount_minor, current_amount_minor,
  created_by, next_doubling_at
)
values
  (
    '25000000-0000-0000-0000-0000000000a1',
    '21000000-0000-0000-0000-0000000000a1',
    '23000000-0000-0000-0000-0000000000a2',
    '22000000-0000-0000-0000-0000000000a1',
    '24000000-0000-0000-0000-0000000000a1',
    'Late to training', 500, 500,
    '20000000-0000-0000-0000-0000000000a1',
    now() + interval '7 days'
  ),
  (
    '25000000-0000-0000-0000-0000000000b1',
    '21000000-0000-0000-0000-0000000000b1',
    '23000000-0000-0000-0000-0000000000b2',
    '22000000-0000-0000-0000-0000000000b1',
    '24000000-0000-0000-0000-0000000000b1',
    'Forgot kit', 300, 300,
    '20000000-0000-0000-0000-0000000000b1',
    now() + interval '7 days'
  );

insert into public.fine_events (fine_id, type, actor_user_id, new_amount_minor)
values
  ('25000000-0000-0000-0000-0000000000a1', 'CREATED', '20000000-0000-0000-0000-0000000000a1', 500),
  ('25000000-0000-0000-0000-0000000000b1', 'CREATED', '20000000-0000-0000-0000-0000000000b1', 300);

select throws_ok(
  $$insert into public.fines (
      team_id, player_team_member_id, origin_season_id, reason_snapshot,
      original_amount_minor, current_amount_minor, created_by, next_doubling_at
    ) values (
      '21000000-0000-0000-0000-0000000000a1',
      '23000000-0000-0000-0000-0000000000a2',
      '22000000-0000-0000-0000-0000000000a1',
      'Fractional fine', 10.5, 10.5,
      '20000000-0000-0000-0000-0000000000a1',
      now() + interval '7 days'
    )$$,
  '23514',
  null,
  'Fine amounts cannot contain fractional minor units'
);

select throws_ok(
  $$insert into public.fines (
      team_id, player_team_member_id, origin_season_id, reason_snapshot,
      original_amount_minor, current_amount_minor, created_by, next_doubling_at
    ) values (
      '21000000-0000-0000-0000-0000000000a1',
      '23000000-0000-0000-0000-0000000000a2',
      '22000000-0000-0000-0000-0000000000b1',
      'Wrong season', 100, 100,
      '20000000-0000-0000-0000-0000000000a1',
      now() + interval '7 days'
    )$$,
  '23503',
  null,
  'Fine origin season must belong to the same team'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-0000000000a2', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-0000000000a2","role":"authenticated","email":"player-a@rules.test"}', true);

select results_eq(
  $$select title from public.rules order by title$$,
  $$values ('Late to training'::text)$$,
  'Team A player can read Team A rules'
);

select results_eq(
  $$select reason_snapshot from public.fines order by reason_snapshot$$,
  $$values ('Late to training'::text)$$,
  'Team A player can read Team A fines'
);

select is(
  (select count(*)::integer from public.rules where team_id = '21000000-0000-0000-0000-0000000000b1'),
  0,
  'Team A player cannot read Team B rules'
);

select is(
  (select count(*)::integer from public.fines where team_id = '21000000-0000-0000-0000-0000000000b1'),
  0,
  'Team A player cannot read Team B fines'
);

select is(
  (
    select count(*)::integer
    from public.fine_events e
    where e.fine_id = '25000000-0000-0000-0000-0000000000b1'
  ),
  0,
  'Team A player cannot read Team B fine events'
);

select is(
  (
    select count(*)::integer
    from public.fine_events e
    where e.fine_id = '25000000-0000-0000-0000-0000000000a1'
  ),
  1,
  'Team A player can read Team A fine events'
);

select throws_ok(
  $$insert into public.fine_events(fine_id, type, actor_user_id)
    values ('25000000-0000-0000-0000-0000000000a1', 'CANCELLED', '20000000-0000-0000-0000-0000000000a2')$$,
  '42501',
  null,
  'Authenticated users cannot directly insert audit events'
);

select throws_ok(
  $$select public.create_rule(
      '21000000-0000-0000-0000-0000000000a1',
      '22000000-0000-0000-0000-0000000000a1',
      'Player-created rule', null, 250
    )$$,
  '42501',
  'INSUFFICIENT_PERMISSION',
  'PLAYER cannot create rules'
);

select throws_ok(
  $$select public.update_rule(
      '24000000-0000-0000-0000-0000000000a1',
      '21000000-0000-0000-0000-0000000000a1',
      '22000000-0000-0000-0000-0000000000a1',
      'Changed by player', null, 500
    )$$,
  '42501',
  'INSUFFICIENT_PERMISSION',
  'PLAYER cannot edit rules'
);

select throws_ok(
  $$select public.set_rule_active('24000000-0000-0000-0000-0000000000a1', false)$$,
  '42501',
  'INSUFFICIENT_PERMISSION',
  'PLAYER cannot deactivate rules'
);

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-0000000000a3', true);
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-0000000000a3","role":"authenticated","email":"coach-a@rules.test"}', true);

select lives_ok(
  $$select public.create_rule(
      '21000000-0000-0000-0000-0000000000a1',
      '22000000-0000-0000-0000-0000000000a1',
      'Coach rule', 'Created by coach', 450
    )$$,
  'COACH can create a rule in own active season'
);

select throws_ok(
  $$select public.create_rule(
      '21000000-0000-0000-0000-0000000000a1',
      '22000000-0000-0000-0000-0000000000b1',
      'Wrong season', null, 450
    )$$,
  '22023',
  'INVALID_ACTIVE_SEASON',
  'COACH cannot create a rule using another team season'
);

select public.set_rule_active('24000000-0000-0000-0000-0000000000a1', false);

select results_eq(
  $$select title from public.rules
    where id = '24000000-0000-0000-0000-0000000000a1'
      and is_active = false$$,
  $$values ('Late to training'::text)$$,
  'Inactive rule remains readable for management and history'
);

select * from finish();
rollback;
