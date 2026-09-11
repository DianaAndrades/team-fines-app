begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users(id, email) values
('b1000000-0000-0000-0000-000000000001', 'transfer-owner@example.com'),
('b1000000-0000-0000-0000-000000000002', 'transfer-coach@example.com'),
('b1000000-0000-0000-0000-000000000003', 'transfer-player@example.com'),
('b1000000-0000-0000-0000-000000000004', 'transfer-removed@example.com');
insert into public.teams(id, name, currency_code) values
('b2000000-0000-0000-0000-000000000001', 'Transfer FC', 'EUR'),
('b2000000-0000-0000-0000-000000000002', 'Other FC', 'EUR');
insert into public.team_members(id, team_id, user_id, role, status) values
('b3000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'OWNER', 'ACTIVE'),
('b3000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', 'COACH', 'ACTIVE'),
('b3000000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003', 'PLAYER', 'ACTIVE'),
('b3000000-0000-0000-0000-000000000004', 'b2000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000004', 'PLAYER', 'REMOVED'),
('b3000000-0000-0000-0000-000000000005', 'b2000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000003', 'OWNER', 'ACTIVE');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000002', true);
select throws_ok(
$$select public.transfer_ownership('b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000003')$$,
'42501', 'OWNER_REQUIRED', 'COACH cannot transfer ownership');

select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000001', true);
select throws_ok(
$$select public.transfer_ownership('b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000004')$$,
'22023', 'INVALID_TRANSFER_TARGET', 'Removed member cannot become owner');
select throws_ok(
$$select public.transfer_ownership('b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000005')$$,
'22023', 'INVALID_TRANSFER_TARGET', 'Cross-team target cannot become owner');
select lives_ok(
$$select public.transfer_ownership('b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000003')$$,
'OWNER can transfer to active PLAYER');
select is(
(select role::text from public.team_members where id = 'b3000000-0000-0000-0000-000000000001'),
'COACH', 'Previous owner becomes coach');
select is(
(select role::text from public.team_members where id = 'b3000000-0000-0000-0000-000000000003'),
'OWNER', 'Target becomes owner');
select is(
(select count(*)::integer from public.team_members where team_id = 'b2000000-0000-0000-0000-000000000001' and role = 'OWNER' and status = 'ACTIVE'),
1, 'Exactly one active owner remains');
select throws_ok(
$$select public.transfer_ownership('b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000002')$$,
'42501', 'OWNER_REQUIRED', 'Previous owner immediately loses transfer permission');
select * from finish();
rollback;
