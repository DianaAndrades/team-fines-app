begin;

create extension if not exists pgtap with schema extensions;
select plan(3);

insert into auth.users (id, email)
values
  ('74000000-0000-0000-0000-000000000001', 'owner-accept@notifications.test'),
  ('74000000-0000-0000-0000-000000000002', 'player-accept@notifications.test');

insert into public.profiles (id, email, display_name)
values
  ('74000000-0000-0000-0000-000000000001', 'owner-accept@notifications.test', 'Owner'),
  ('74000000-0000-0000-0000-000000000002', 'player-accept@notifications.test', 'Alex')
on conflict (id) do nothing;

insert into public.teams (id, name, currency_code)
values ('74100000-0000-0000-0000-000000000001', 'Accepted Dispute FC', 'EUR');

insert into public.seasons (id, team_id, name, is_active)
values ('74200000-0000-0000-0000-000000000001', '74100000-0000-0000-0000-000000000001', '2026/27', true);

insert into public.team_members (id, team_id, user_id, role, status)
values
  ('74300000-0000-0000-0000-000000000001', '74100000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000001', 'OWNER', 'ACTIVE'),
  ('74300000-0000-0000-0000-000000000002', '74100000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000002', 'PLAYER', 'ACTIVE');

insert into public.season_members (season_id, team_member_id)
values
  ('74200000-0000-0000-0000-000000000001', '74300000-0000-0000-0000-000000000001'),
  ('74200000-0000-0000-0000-000000000001', '74300000-0000-0000-0000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '74000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"74000000-0000-0000-0000-000000000001","role":"authenticated","email":"owner-accept@notifications.test"}', true);

select public.create_fine(
  '74100000-0000-0000-0000-000000000001',
  '74300000-0000-0000-0000-000000000002',
  null,
  'Accepted dispute notification',
  900
);

select set_config('request.jwt.claim.sub', '74000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"74000000-0000-0000-0000-000000000002","role":"authenticated","email":"player-accept@notifications.test"}', true);

select public.open_fine_dispute(
  (select id from public.fines where reason_snapshot = 'Accepted dispute notification'),
  'This fine was assigned to the wrong player'
);

select set_config('request.jwt.claim.sub', '74000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"74000000-0000-0000-0000-000000000001","role":"authenticated","email":"owner-accept@notifications.test"}', true);

select lives_ok(
  $$select public.accept_fine_dispute(
    (select id from public.fines where reason_snapshot = 'Accepted dispute notification'),
    'The player is correct'
  )$$,
  'staff can accept the dispute'
);

reset role;
set local role service_role;

select is(
  (
    select count(*)::integer
    from public.notifications
    where user_id = '74000000-0000-0000-0000-000000000002'
      and type = 'DISPUTE_RESOLVED'
  ),
  1,
  'accepted dispute creates one resolution notification for the player'
);

select ok(
  exists (
    select 1
    from public.notifications n
    join public.fines f on f.id = n.fine_id
    where f.reason_snapshot = 'Accepted dispute notification'
      and n.user_id = '74000000-0000-0000-0000-000000000002'
      and n.type = 'DISPUTE_RESOLVED'
      and n.idempotency_key = 'dispute-resolved:' || f.id::text || ':accepted'
  ),
  'accepted dispute notification uses a stable resolution key'
);

select * from finish();
rollback;
