begin;

create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users (id, email)
values
  ('a1000000-0000-0000-0000-000000000001', 'rollover-owner-a@example.com'),
  ('a1000000-0000-0000-0000-000000000002', 'rollover-coach-a@example.com'),
  ('a1000000-0000-0000-0000-000000000003', 'rollover-player-one@example.com'),
  ('a1000000-0000-0000-0000-000000000004', 'rollover-player-two@example.com'),
  ('a1000000-0000-0000-0000-000000000005', 'rollover-owner-b@example.com');

insert into public.teams (id, name, currency_code)
values
  ('a2000000-0000-0000-0000-000000000001', 'Rollover FC', 'EUR'),
  ('a2000000-0000-0000-0000-000000000002', 'Other Rollover FC', 'GBP');

insert into public.seasons (id, team_id, name, is_active)
values
  ('a3000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', '2026/27', true),
  ('a3000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000002', '2026/27', true);

insert into public.team_members (id, team_id, user_id, role, status)
values
  ('a4000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'OWNER', 'ACTIVE'),
  ('a4000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'COACH', 'ACTIVE'),
  ('a4000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'PLAYER', 'ACTIVE'),
  ('a4000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000004', 'PLAYER', 'ACTIVE'),
  ('a4000000-0000-0000-0000-000000000005', 'a2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000005', 'OWNER', 'ACTIVE');

insert into public.season_members (season_id, team_member_id, active)
values
  ('a3000000-0000-0000-0000-000000000001', 'a4000000-0000-0000-0000-000000000001', true),
  ('a3000000-0000-0000-0000-000000000001', 'a4000000-0000-0000-0000-000000000002', true),
  ('a3000000-0000-0000-0000-000000000001', 'a4000000-0000-0000-0000-000000000003', true),
  ('a3000000-0000-0000-0000-000000000001', 'a4000000-0000-0000-0000-000000000004', true),
  ('a3000000-0000-0000-0000-000000000002', 'a4000000-0000-0000-0000-000000000005', true);

insert into public.rules (
  id, team_id, season_id, title, description, default_amount_minor, is_active, created_by
)
values
  (
    'a5000000-0000-0000-0000-000000000001',
    'a2000000-0000-0000-0000-000000000001',
    'a3000000-0000-0000-0000-000000000001',
    'Late to training',
    'Five minutes late or more',
    500,
    true,
    'a1000000-0000-0000-0000-000000000001'
  ),
  (
    'a5000000-0000-0000-0000-000000000002',
    'a2000000-0000-0000-0000-000000000001',
    'a3000000-0000-0000-0000-000000000001',
    'Forgot kit',
    null,
    300,
    false,
    'a1000000-0000-0000-0000-000000000001'
  );

insert into public.fines (
  id,
  team_id,
  player_team_member_id,
  origin_season_id,
  reason_snapshot,
  original_amount_minor,
  current_amount_minor,
  status,
  created_by,
  created_at,
  next_doubling_at,
  paid_at,
  paid_by,
  cancelled_at,
  cancelled_by,
  cancellation_reason,
  dispute_reason,
  disputed_at,
  disputed_by,
  dispute_remaining_seconds
)
values
  (
    'a6000000-0000-0000-0000-000000000001',
    'a2000000-0000-0000-0000-000000000001',
    'a4000000-0000-0000-0000-000000000003',
    'a3000000-0000-0000-0000-000000000001',
    'Pending debt',
    500,
    1000,
    'PENDING',
    'a1000000-0000-0000-0000-000000000001',
    '2026-09-01T12:00:00Z',
    '2026-10-01T12:00:00Z',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null
  ),
  (
    'a6000000-0000-0000-0000-000000000002',
    'a2000000-0000-0000-0000-000000000001',
    'a4000000-0000-0000-0000-000000000004',
    'a3000000-0000-0000-0000-000000000001',
    'Disputed debt',
    750,
    1500,
    'DISPUTED',
    'a1000000-0000-0000-0000-000000000001',
    '2026-09-02T12:00:00Z',
    null,
    null,
    null,
    null,
    null,
    null,
    'Wrong player',
    '2026-09-09T12:00:00Z',
    'a1000000-0000-0000-0000-000000000004',
    12345
  ),
  (
    'a6000000-0000-0000-0000-000000000003',
    'a2000000-0000-0000-0000-000000000001',
    'a4000000-0000-0000-0000-000000000003',
    'a3000000-0000-0000-0000-000000000001',
    'Paid history',
    400,
    400,
    'PAID',
    'a1000000-0000-0000-0000-000000000001',
    '2026-08-20T12:00:00Z',
    null,
    '2026-08-25T12:00:00Z',
    'a1000000-0000-0000-0000-000000000001',
    null,
    null,
    null,
    null,
    null,
    null,
    null
  ),
  (
    'a6000000-0000-0000-0000-000000000004',
    'a2000000-0000-0000-0000-000000000001',
    'a4000000-0000-0000-0000-000000000004',
    'a3000000-0000-0000-0000-000000000001',
    'Cancelled history',
    900,
    900,
    'CANCELLED',
    'a1000000-0000-0000-0000-000000000001',
    '2026-08-21T12:00:00Z',
    null,
    null,
    null,
    '2026-08-26T12:00:00Z',
    'a1000000-0000-0000-0000-000000000001',
    'Waived',
    null,
    null,
    null,
    null
  );

insert into public.fine_season_links (fine_id, season_id, link_type)
values
  ('a6000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'ORIGIN'),
  ('a6000000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000001', 'ORIGIN'),
  ('a6000000-0000-0000-0000-000000000003', 'a3000000-0000-0000-0000-000000000001', 'ORIGIN'),
  ('a6000000-0000-0000-0000-000000000004', 'a3000000-0000-0000-0000-000000000001', 'ORIGIN');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-0000-0000-000000000001","role":"authenticated","email":"rollover-owner-a@example.com"}',
  true
);

select lives_ok(
  $$select set_config(
    'test.rollover_season_id',
    public.start_new_season(
      'a2000000-0000-0000-0000-000000000001',
      '2027/28',
      true,
      true,
      true,
      true
    )::text,
    true
  )$$,
  'OWNER can start a new season transactionally'
);

select is(
  (select count(*)::integer from public.seasons where team_id = 'a2000000-0000-0000-0000-000000000001' and is_active),
  1,
  'rollover leaves exactly one active season'
);

select is(
  (select is_active from public.seasons where id = 'a3000000-0000-0000-0000-000000000001'),
  false,
  'old season becomes inactive'
);

select is(
  (
    select name
    from public.seasons
    where id = nullif(current_setting('test.rollover_season_id', true), '')::uuid
      and is_active
  ),
  '2027/28'::text,
  'new season becomes the active season'
);

select is(
  (
    select count(*)::integer
    from public.season_members sm
    where sm.season_id = nullif(current_setting('test.rollover_season_id', true), '')::uuid
      and sm.active
  ),
  4,
  'selected active roster members are copied to the new season'
);

select results_eq(
  $$select tm.role::text, count(*)::bigint
    from public.season_members sm
    join public.team_members tm on tm.id = sm.team_member_id
    where sm.season_id = nullif(current_setting('test.rollover_season_id', true), '')::uuid
      and sm.active
    group by tm.role
    order by tm.role::text$$,
  $$values
    ('COACH'::text, 1::bigint),
    ('OWNER'::text, 1::bigint),
    ('PLAYER'::text, 2::bigint)$$,
  'rollover copies players and staff using their current team roles'
);

select is(
  (
    select count(*)::integer
    from public.rules
    where season_id = nullif(current_setting('test.rollover_season_id', true), '')::uuid
  ),
  2,
  'selected rules are cloned into the new season'
);

select results_eq(
  $$select title, coalesce(description, ''), default_amount_minor::text, is_active
    from public.rules
    where season_id = nullif(current_setting('test.rollover_season_id', true), '')::uuid
    order by title$$,
  $$values
    ('Forgot kit'::text, ''::text, '300'::text, false),
    ('Late to training'::text, 'Five minutes late or more'::text, '500'::text, true)$$,
  'cloned rules preserve values and active state'
);

select is(
  (
    select count(*)::integer
    from public.fine_season_links
    where season_id = nullif(current_setting('test.rollover_season_id', true), '')::uuid
      and link_type = 'CARRIED'
  ),
  2,
  'only unpaid active debt is linked into the new season'
);

select results_eq(
  $$select fine_id::text
    from public.fine_season_links
    where season_id = nullif(current_setting('test.rollover_season_id', true), '')::uuid
      and link_type = 'CARRIED'
    order by fine_id$$,
  $$values
    ('a6000000-0000-0000-0000-000000000001'::text),
    ('a6000000-0000-0000-0000-000000000002'::text)$$,
  'pending and disputed fines keep their original identities when carried'
);

select ok(
  exists (
    select 1
    from public.fines
    where id = 'a6000000-0000-0000-0000-000000000001'
      and origin_season_id = 'a3000000-0000-0000-0000-000000000001'
      and current_amount_minor = 1000
      and next_doubling_at = '2026-10-01T12:00:00Z'::timestamptz
      and status = 'PENDING'
  ),
  'carried pending debt preserves origin, amount, deadline and status'
);

select ok(
  exists (
    select 1
    from public.fines
    where id = 'a6000000-0000-0000-0000-000000000002'
      and origin_season_id = 'a3000000-0000-0000-0000-000000000001'
      and current_amount_minor = 1500
      and next_doubling_at is null
      and status = 'DISPUTED'
      and dispute_remaining_seconds = 12345
      and dispute_reason = 'Wrong player'
  ),
  'carried disputed debt preserves frozen timer and dispute state'
);

select is(
  (
    select count(*)::integer
    from public.fine_season_links
    where season_id = nullif(current_setting('test.rollover_season_id', true), '')::uuid
      and fine_id in (
        'a6000000-0000-0000-0000-000000000003',
        'a6000000-0000-0000-0000-000000000004'
      )
  ),
  0,
  'paid and cancelled history is not carried as active debt'
);

select throws_ok(
  $$select public.start_new_season(
    'a2000000-0000-0000-0000-000000000001',
    '2027/28',
    true,
    true,
    true,
    true
  )$$,
  '23505',
  'SEASON_ALREADY_EXISTS',
  'rerunning the same season name is rejected instead of duplicating rollover'
);

select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000005', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-0000-0000-000000000005","role":"authenticated","email":"rollover-owner-b@example.com"}',
  true
);

select throws_ok(
  $$select public.start_new_season(
    'a2000000-0000-0000-0000-000000000001',
    'Cross-team attempt',
    true,
    true,
    true,
    true
  )$$,
  '42501',
  'OWNER_REQUIRED',
  'owner of another team cannot roll this team season'
);

select * from finish();
rollback;
