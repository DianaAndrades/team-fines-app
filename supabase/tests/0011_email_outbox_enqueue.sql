begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email)
values
  ('80000000-0000-0000-0000-000000000001', 'owner@email-outbox.test'),
  ('80000000-0000-0000-0000-000000000002', 'player@email-outbox.test');

insert into public.profiles (id, email, display_name)
values
  ('80000000-0000-0000-0000-000000000001', 'owner@email-outbox.test', 'Owner'),
  ('80000000-0000-0000-0000-000000000002', 'player@email-outbox.test', 'Alex')
on conflict (id) do nothing;

insert into public.teams (id, name, currency_code)
values ('81000000-0000-0000-0000-000000000001', 'Sunday XI', 'EUR');

insert into public.seasons (id, team_id, name, is_active)
values ('82000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000001', '2026/27', true);

insert into public.team_members (id, team_id, user_id, role, status)
values
  ('83000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 'OWNER', 'ACTIVE'),
  ('83000000-0000-0000-0000-000000000002', '81000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000002', 'PLAYER', 'ACTIVE');

insert into public.season_members (season_id, team_member_id)
values
  ('82000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000001'),
  ('82000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '80000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"80000000-0000-0000-0000-000000000001","role":"authenticated","email":"owner@email-outbox.test"}', true);

select lives_ok(
  $$select public.create_fine(
    '81000000-0000-0000-0000-000000000001',
    '83000000-0000-0000-0000-000000000002',
    null,
    'Late to training',
    500
  )$$,
  'creating a fine succeeds before email delivery'
);

reset role;
set local role service_role;

select is(
  (
    select count(*)::integer
    from public.email_outbox
    where recipient_email = 'player@email-outbox.test'
      and template_key = 'FINE_NOTIFICATION'
  ),
  1,
  'new fine queues exactly one email for the player'
);

select ok(
  exists (
    select 1
    from public.email_outbox e
    join public.fines f on e.idempotency_key = 'email:new-fine:' || f.id::text
    where f.reason_snapshot = 'Late to training'
      and e.status = 'PENDING'
  ),
  'new fine email uses the notification key with an email prefix'
);

select ok(
  exists (
    select 1
    from public.email_outbox e
    where e.recipient_email = 'player@email-outbox.test'
      and e.payload ->> 'notificationType' = 'NEW_FINE'
      and e.payload ->> 'teamName' = 'Sunday XI'
      and e.payload ->> 'playerName' = 'Alex'
      and e.payload ->> 'reason' = 'Late to training'
      and e.payload ->> 'currentAmountMinor' = '500'
      and e.payload ->> 'currencyCode' = 'EUR'
  ),
  'new fine email payload contains display-ready fine context'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '80000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"80000000-0000-0000-0000-000000000001","role":"authenticated","email":"owner@email-outbox.test"}', true);

select set_config(
  'test.email_invitation_id',
  public.invite_team_member(
    '81000000-0000-0000-0000-000000000001',
    'coach.invite@example.com',
    'COACH'
  )::text,
  true
);

select lives_ok(
  $$select current_setting('test.email_invitation_id')::uuid$$,
  'staff invitation succeeds before email delivery'
);

reset role;
set local role service_role;

select is(
  (
    select count(*)::integer
    from public.email_outbox
    where recipient_email = 'coach.invite@example.com'
      and template_key = 'TEAM_INVITATION'
      and idempotency_key = 'team-invite:' || current_setting('test.email_invitation_id') || ':1'
  ),
  1,
  'team invitation queues one versioned email'
);

select ok(
  exists (
    select 1
    from public.email_outbox
    where idempotency_key = 'team-invite:' || current_setting('test.email_invitation_id') || ':1'
      and payload ->> 'teamName' = 'Sunday XI'
      and payload ->> 'role' = 'COACH'
  ),
  'team invitation email payload contains team and role'
);

select * from finish();
rollback;
