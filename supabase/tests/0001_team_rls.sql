begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-0000000000a1', 'a@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'b@example.com');

insert into public.profiles (id, email)
values
  ('00000000-0000-0000-0000-0000000000a1', 'a@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'b@example.com')
on conflict (id) do nothing;

insert into public.teams (id, name, currency_code)
values
  ('10000000-0000-0000-0000-0000000000a1', 'Team A', 'EUR'),
  ('10000000-0000-0000-0000-0000000000b1', 'Team B', 'GBP');

insert into public.team_members (team_id, user_id, role)
values
  ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'OWNER'),
  ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'OWNER');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$select id from public.teams order by id$$,
  $$values ('10000000-0000-0000-0000-0000000000a1'::uuid)$$,
  'User A can select only Team A'
);

select results_eq(
  $$select user_id from public.team_members where team_id = '10000000-0000-0000-0000-0000000000a1'::uuid$$,
  $$values ('00000000-0000-0000-0000-0000000000a1'::uuid)$$,
  'User A can select Team A roster'
);

select is(
  (select count(*)::integer from public.teams where id = '10000000-0000-0000-0000-0000000000b1'::uuid),
  0,
  'User A gets zero rows for Team B'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);

select is(
  (select count(*)::integer from public.teams where id = '10000000-0000-0000-0000-0000000000a1'::uuid),
  0,
  'User B gets zero rows for Team A'
);

reset role;

select is(
  (select count(*)::integer from public.team_members where team_id = '10000000-0000-0000-0000-0000000000a1'::uuid and role = 'OWNER' and status = 'ACTIVE'),
  1,
  'Exactly one active OWNER exists for Team A'
);

select throws_ok(
  $$insert into public.team_members (team_id, user_id, role) values ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'PLAYER')$$,
  '23505',
  null,
  'Duplicate active membership is rejected'
);

select * from finish();
rollback;
