begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'invitee@example.com'),
  ('00000000-0000-0000-0000-0000000000c1', 'coach@example.com'),
  ('00000000-0000-0000-0000-0000000000d1', 'player@example.com'),
  ('00000000-0000-0000-0000-0000000000e1', 'wrong@example.com'),
  ('00000000-0000-0000-0000-0000000000f1', 'cancelled@example.com');

insert into public.profiles (id, email)
values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'invitee@example.com'),
  ('00000000-0000-0000-0000-0000000000c1', 'coach@example.com'),
  ('00000000-0000-0000-0000-0000000000d1', 'player@example.com'),
  ('00000000-0000-0000-0000-0000000000e1', 'wrong@example.com'),
  ('00000000-0000-0000-0000-0000000000f1', 'cancelled@example.com')
on conflict (id) do nothing;

insert into public.teams (id, name, currency_code)
values ('10000000-0000-0000-0000-0000000000a1', 'Team A', 'EUR');

insert into public.team_members (team_id, user_id, role)
values
  ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'OWNER'),
  ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'COACH'),
  ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1', 'PLAYER');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","email":"coach@example.com"}', true);
select lives_ok(
  $$select public.invite_team_member('10000000-0000-0000-0000-0000000000a1', 'new-player@example.com', 'PLAYER')$$,
  'Coach can invite a PLAYER'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated","email":"player@example.com"}', true);
select throws_ok(
  $$select public.invite_team_member('10000000-0000-0000-0000-0000000000a1', 'blocked@example.com', 'PLAYER')$$,
  '42501',
  'TEAM_STAFF_REQUIRED',
  'Player cannot create invitations'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","email":"owner@example.com"}', true);
select lives_ok(
  $$select public.invite_team_member('10000000-0000-0000-0000-0000000000a1', 'new-coach@example.com', 'COACH')$$,
  'OWNER can invite a COACH'
);

select ok(
  (
    select expires_at >= created_at + interval '6 days 23 hours'
      and expires_at <= created_at + interval '7 days 1 hour'
    from public.team_invitations
    where team_id = '10000000-0000-0000-0000-0000000000a1'
      and email_normalized = 'new-coach@example.com'
  ),
  'Invitation expires after seven days'
);

select public.invite_team_member(
  '10000000-0000-0000-0000-0000000000a1',
  'invitee@example.com',
  'PLAYER'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated","email":"wrong@example.com"}', true);
select throws_ok(
  $$select public.accept_team_invitation((select id from public.team_invitations where email_normalized = 'invitee@example.com' and status = 'PENDING'))$$,
  '42501',
  'INVITATION_EMAIL_MISMATCH',
  'Wrong email cannot accept invitation'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated","email":"invitee@example.com"}', true);
select public.accept_team_invitation(
  (select id from public.team_invitations where email_normalized = 'invitee@example.com' and status = 'PENDING')
);

select is(
  (
    select count(*)::integer
    from public.team_members
    where team_id = '10000000-0000-0000-0000-0000000000a1'
      and user_id = '00000000-0000-0000-0000-0000000000b1'
      and status = 'ACTIVE'
  ),
  1,
  'Accepted invitation creates exactly one active membership'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","email":"owner@example.com"}', true);
select throws_ok(
  $$select public.invite_team_member('10000000-0000-0000-0000-0000000000a1', 'invitee@example.com', 'PLAYER')$$,
  '23505',
  'ALREADY_MEMBER',
  'Duplicate active membership is rejected'
);

select public.invite_team_member(
  '10000000-0000-0000-0000-0000000000a1',
  'cancelled@example.com',
  'PLAYER'
);
select public.cancel_team_invitation(
  (select id from public.team_invitations where email_normalized = 'cancelled@example.com' and status = 'PENDING')
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f1', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated","email":"cancelled@example.com"}', true);
select throws_ok(
  $$select public.accept_team_invitation((select id from public.team_invitations where email_normalized = 'cancelled@example.com'))$$,
  '22023',
  'INVITATION_NOT_PENDING',
  'Cancelled invitation cannot be accepted'
);

select * from finish();
rollback;
