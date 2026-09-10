begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email)
values
  ('50000000-0000-0000-0000-000000000001', 'coach@queue.test'),
  ('50000000-0000-0000-0000-000000000002', 'player@queue.test');

insert into public.profiles (id, email)
values
  ('50000000-0000-0000-0000-000000000001', 'coach@queue.test'),
  ('50000000-0000-0000-0000-000000000002', 'player@queue.test')
on conflict (id) do nothing;

insert into public.teams (id, name, currency_code)
values ('51000000-0000-0000-0000-000000000001', 'Queue FC', 'EUR');

insert into public.seasons (id, team_id, name, is_active)
values ('52000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', '2026/27', true);

insert into public.team_members (id, team_id, user_id, role, status)
values
  ('53000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'COACH', 'ACTIVE'),
  ('53000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 'PLAYER', 'ACTIVE');

insert into public.fines (
  id, team_id, player_team_member_id, origin_season_id, reason_snapshot,
  original_amount_minor, current_amount_minor, status, created_by,
  created_at, next_doubling_at, dispute_reason, disputed_at, disputed_by,
  dispute_remaining_seconds
)
values (
  '54000000-0000-0000-0000-000000000001',
  '51000000-0000-0000-0000-000000000001',
  '53000000-0000-0000-0000-000000000002',
  '52000000-0000-0000-0000-000000000001',
  'Late to training', 500, 1000, 'DISPUTED',
  '50000000-0000-0000-0000-000000000001',
  now() - interval '8 days', null,
  'The session started later', now() - interval '1 hour',
  '50000000-0000-0000-0000-000000000002', 345600
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

select has_function('public', 'list_open_disputes', array['uuid'], 'staff dispute queue RPC exists');

select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"50000000-0000-0000-0000-000000000002","role":"authenticated","email":"player@queue.test"}', true);
select throws_ok(
  $$select * from public.list_open_disputes('51000000-0000-0000-0000-000000000001')$$,
  '42501',
  'INSUFFICIENT_PERMISSION',
  'players cannot read the staff dispute queue'
);

select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"50000000-0000-0000-0000-000000000001","role":"authenticated","email":"coach@queue.test"}', true);
select is(
  (select count(*)::integer from public.list_open_disputes('51000000-0000-0000-0000-000000000001')),
  1,
  'staff sees only open disputed fines for the team'
);

select ok(
  exists (
    select 1
    from public.list_open_disputes('51000000-0000-0000-0000-000000000001') d
    where d.fine_id = '54000000-0000-0000-0000-000000000001'
      and d.player_name = 'player@queue.test'
      and d.fine_reason = 'Late to training'
      and d.dispute_reason = 'The session started later'
      and d.current_amount_minor = 1000
      and d.remaining_seconds = 345600
  ),
  'queue returns player, fine, reason, amount and frozen timer'
);

select * from finish();
rollback;
