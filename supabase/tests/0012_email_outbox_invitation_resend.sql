begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, email)
values ('84000000-0000-0000-0000-000000000001', 'owner@resend.test');

insert into public.teams (id, name, currency_code)
values ('85000000-0000-0000-0000-000000000001', 'Sunday XI', 'EUR');

insert into public.team_members (id, team_id, user_id, role, status)
values (
  '86000000-0000-0000-0000-000000000001',
  '85000000-0000-0000-0000-000000000001',
  '84000000-0000-0000-0000-000000000001',
  'OWNER',
  'ACTIVE'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '84000000-0000-0000-0000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"84000000-0000-0000-0000-000000000001","role":"authenticated","email":"owner@resend.test"}',
  true
);

select set_config(
  'test.resend_invitation_id',
  public.invite_team_member(
    '85000000-0000-0000-0000-000000000001',
    'coach.resend@example.com',
    'COACH'
  )::text,
  true
);

select lives_ok(
  format(
    'select public.resend_team_invitation(%L::uuid)',
    current_setting('test.resend_invitation_id')
  ),
  'staff can resend a pending invitation'
);

reset role;
set local role service_role;

select is(
  (
    select delivery_version
    from public.team_invitations
    where id = current_setting('test.resend_invitation_id')::uuid
  ),
  2,
  'resending increments the delivery version'
);

select ok(
  (
    select expires_at > now() + interval '6 days 23 hours'
    from public.team_invitations
    where id = current_setting('test.resend_invitation_id')::uuid
  ),
  'resending refreshes the seven-day expiry window'
);

select is(
  (
    select count(*)::integer
    from public.email_outbox
    where idempotency_key like 'team-invite:' || current_setting('test.resend_invitation_id') || ':%'
  ),
  2,
  'resending keeps the original email and queues one new delivery'
);

select ok(
  exists (
    select 1
    from public.email_outbox
    where idempotency_key = 'team-invite:' || current_setting('test.resend_invitation_id') || ':2'
      and recipient_email = 'coach.resend@example.com'
      and payload ->> 'teamName' = 'Sunday XI'
      and payload ->> 'role' = 'COACH'
  ),
  'resending queues a version-two email with the invitation context'
);

select * from finish();
rollback;
