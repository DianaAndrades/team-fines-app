begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

insert into auth.users (id, email)
values
  ('40000000-0000-0000-0000-0000000000a1', 'owner-a@reads.test'),
  ('40000000-0000-0000-0000-0000000000a2', 'player-a@reads.test'),
  ('40000000-0000-0000-0000-0000000000a3', 'bench-a@reads.test'),
  ('40000000-0000-0000-0000-0000000000b1', 'owner-b@reads.test'),
  ('40000000-0000-0000-0000-0000000000b2', 'player-b@reads.test');

insert into public.profiles (id, email, display_name)
values
  ('40000000-0000-0000-0000-0000000000a1', 'owner-a@reads.test', 'Owner A'),
  ('40000000-0000-0000-0000-0000000000a2', 'player-a@reads.test', 'Alex Player'),
  ('40000000-0000-0000-0000-0000000000a3', 'bench-a@reads.test', 'Bench Player'),
  ('40000000-0000-0000-0000-0000000000b1', 'owner-b@reads.test', 'Owner B'),
  ('40000000-0000-0000-0000-0000000000b2', 'player-b@reads.test', 'Other Player')
on conflict (id) do update set display_name = excluded.display_name;

insert into public.teams (id, name, currency_code)
values
  ('41000000-0000-0000-0000-0000000000a1', 'Read Team A', 'EUR'),
  ('41000000-0000-0000-0000-0000000000b1', 'Read Team B', 'GBP');

insert into public.seasons (id, team_id, name, is_active)
values
  ('42000000-0000-0000-0000-0000000000a1', '41000000-0000-0000-0000-0000000000a1', '2026/27', true),
  ('42000000-0000-0000-0000-0000000000b1', '41000000-0000-0000-0000-0000000000b1', '2026/27', true);

insert into public.team_members (id, team_id, user_id, role, status)
values
  ('43000000-0000-0000-0000-0000000000a1', '41000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a1', 'OWNER', 'ACTIVE'),
  ('43000000-0000-0000-0000-0000000000a2', '41000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a2', 'PLAYER', 'ACTIVE'),
  ('43000000-0000-0000-0000-0000000000a3', '41000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a3', 'PLAYER', 'ACTIVE'),
  ('43000000-0000-0000-0000-0000000000b1', '41000000-0000-0000-0000-0000000000b1', '40000000-0000-0000-0000-0000000000b1', 'OWNER', 'ACTIVE'),
  ('43000000-0000-0000-0000-0000000000b2', '41000000-0000-0000-0000-0000000000b1', '40000000-0000-0000-0000-0000000000b2', 'PLAYER', 'ACTIVE');

insert into public.season_members (season_id, team_member_id, active)
values
  ('42000000-0000-0000-0000-0000000000a1', '43000000-0000-0000-0000-0000000000a1', true),
  ('42000000-0000-0000-0000-0000000000a1', '43000000-0000-0000-0000-0000000000a2', true),
  ('42000000-0000-0000-0000-0000000000a1', '43000000-0000-0000-0000-0000000000a3', false),
  ('42000000-0000-0000-0000-0000000000b1', '43000000-0000-0000-0000-0000000000b1', true),
  ('42000000-0000-0000-0000-0000000000b1', '43000000-0000-0000-0000-0000000000b2', true);

insert into public.fines (
  id, team_id, player_team_member_id, origin_season_id,
  reason_snapshot, original_amount_minor, current_amount_minor,
  created_by, created_at, next_doubling_at
)
values
  (
    '44000000-0000-0000-0000-0000000000a1',
    '41000000-0000-0000-0000-0000000000a1',
    '43000000-0000-0000-0000-0000000000a2',
    '42000000-0000-0000-0000-0000000000a1',
    'Late to training', 500, 500,
    '40000000-0000-0000-0000-0000000000a1',
    '2026-09-10T10:00:00Z', '2026-09-17T10:00:00Z'
  ),
  (
    '44000000-0000-0000-0000-0000000000a2',
    '41000000-0000-0000-0000-0000000000a1',
    '43000000-0000-0000-0000-0000000000a2',
    '42000000-0000-0000-0000-0000000000a1',
    'Forgot kit', 300, 300,
    '40000000-0000-0000-0000-0000000000a1',
    '2026-09-11T10:00:00Z', '2026-09-18T10:00:00Z'
  ),
  (
    '44000000-0000-0000-0000-0000000000b1',
    '41000000-0000-0000-0000-0000000000b1',
    '43000000-0000-0000-0000-0000000000b2',
    '42000000-0000-0000-0000-0000000000b1',
    'Other team fine', 900, 900,
    '40000000-0000-0000-0000-0000000000b1',
    '2026-09-10T10:00:00Z', '2026-09-17T10:00:00Z'
  );

insert into public.fine_events (
  id, fine_id, type, actor_user_id, new_amount_minor, created_at
)
values
  ('45000000-0000-0000-0000-0000000000a1', '44000000-0000-0000-0000-0000000000a1', 'CREATED', '40000000-0000-0000-0000-0000000000a1', 500, '2026-09-10T10:00:00Z'),
  ('45000000-0000-0000-0000-0000000000b1', '44000000-0000-0000-0000-0000000000b1', 'CREATED', '40000000-0000-0000-0000-0000000000b1', 900, '2026-09-10T10:00:00Z');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-0000000000a1', true);
select set_config('request.jwt.claims', '{"sub":"40000000-0000-0000-0000-0000000000a1","role":"authenticated","email":"owner-a@reads.test"}', true);

select results_eq(
  $$select fine_id from public.list_team_fines('41000000-0000-0000-0000-0000000000a1')$$,
  $$values
    ('44000000-0000-0000-0000-0000000000a2'::uuid),
    ('44000000-0000-0000-0000-0000000000a1'::uuid)$$,
  'Team fine board is ordered newest first'
);

select results_eq(
  $$select player_name, current_amount_minor from public.list_team_fines('41000000-0000-0000-0000-0000000000a1') where fine_id = '44000000-0000-0000-0000-0000000000a1'$$,
  $$values ('Alex Player'::text, '500'::text)$$,
  'Board exposes teammate label and money as text minor units'
);

select throws_ok(
  $$select * from public.list_team_fines('41000000-0000-0000-0000-0000000000b1')$$,
  '42501',
  'TEAM_ACCESS_DENIED',
  'Member cannot list another team fines'
);

select results_eq(
  $$select team_member_id, player_name from public.list_active_season_players('41000000-0000-0000-0000-0000000000a1')$$,
  $$values ('43000000-0000-0000-0000-0000000000a2'::uuid, 'Alex Player'::text)$$,
  'Active player picker excludes inactive season members'
);

select results_eq(
  $$select fine_id, player_name from public.get_fine_detail('44000000-0000-0000-0000-0000000000a1')$$,
  $$values ('44000000-0000-0000-0000-0000000000a1'::uuid, 'Alex Player'::text)$$,
  'Member can load one fine detail from own team'
);

select throws_ok(
  $$select * from public.get_fine_detail('44000000-0000-0000-0000-0000000000b1')$$,
  '42501',
  'FINE_ACCESS_DENIED',
  'Member cannot load another team fine detail'
);

select results_eq(
  $$select event_id, type::text from public.list_fine_events('44000000-0000-0000-0000-0000000000a1')$$,
  $$values ('45000000-0000-0000-0000-0000000000a1'::uuid, 'CREATED'::text)$$,
  'Member can load own team fine events'
);

select throws_ok(
  $$select * from public.list_fine_events('44000000-0000-0000-0000-0000000000b1')$$,
  '42501',
  'FINE_ACCESS_DENIED',
  'Member cannot load another team fine events'
);

select * from finish();
rollback;
