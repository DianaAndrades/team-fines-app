alter table public.seasons
add constraint seasons_id_team_unique unique (id, team_id);

alter table public.team_members
add constraint team_members_id_team_unique unique (id, team_id);

create table public.season_members (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_member_id uuid not null references public.team_members(id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (season_id, team_member_id)
);

create or replace function public.validate_season_member_team()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.seasons s
    join public.team_members tm on tm.team_id = s.team_id
    where s.id = new.season_id
      and tm.id = new.team_member_id
  ) then
    raise exception 'SEASON_MEMBER_TEAM_MISMATCH' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger season_member_team_guard
before insert or update of season_id, team_member_id
on public.season_members
for each row execute function public.validate_season_member_team();

revoke execute on function public.validate_season_member_team() from public, anon, authenticated;

insert into public.season_members(season_id, team_member_id)
select s.id, tm.id
from public.seasons s
join public.team_members tm on tm.team_id = s.team_id
where s.is_active
  and tm.status = 'ACTIVE'
on conflict (season_id, team_member_id) do nothing;

create table public.rules (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  season_id uuid not null,
  title text not null check (length(trim(title)) between 1 and 120),
  description text,
  default_amount_minor numeric not null check (
    default_amount_minor > 0
    and trunc(default_amount_minor) = default_amount_minor
  ),
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rules_season_team_fk
    foreign key (season_id, team_id)
    references public.seasons(id, team_id)
);

create index rules_team_season_idx
on public.rules(team_id, season_id, is_active);

create type public.fine_status as enum ('PENDING', 'DISPUTED', 'PAID', 'CANCELLED');
create type public.fine_event_type as enum (
  'CREATED',
  'DOUBLED',
  'DISPUTE_OPENED',
  'DISPUTE_ACCEPTED',
  'DISPUTE_REJECTED',
  'AMOUNT_ADJUSTED',
  'PAID',
  'CANCELLED'
);

create table public.fines (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  player_team_member_id uuid not null,
  origin_season_id uuid not null,
  source_rule_id uuid references public.rules(id),
  reason_snapshot text not null check (length(trim(reason_snapshot)) between 1 and 240),
  original_amount_minor numeric not null check (
    original_amount_minor > 0
    and trunc(original_amount_minor) = original_amount_minor
  ),
  current_amount_minor numeric not null check (
    current_amount_minor > 0
    and trunc(current_amount_minor) = current_amount_minor
  ),
  status public.fine_status not null default 'PENDING',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  next_doubling_at timestamptz,
  paid_at timestamptz,
  paid_by uuid references public.profiles(id),
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id),
  cancellation_reason text,
  constraint fines_player_team_fk
    foreign key (player_team_member_id, team_id)
    references public.team_members(id, team_id),
  constraint fines_origin_season_team_fk
    foreign key (origin_season_id, team_id)
    references public.seasons(id, team_id),
  check (
    (status = 'PENDING' and next_doubling_at is not null)
    or (status <> 'PENDING' and next_doubling_at is null)
  )
);

create index fines_team_status_idx on public.fines(team_id, status);
create index fines_due_idx
on public.fines(next_doubling_at)
where status = 'PENDING';

create type public.fine_season_link_type as enum ('ORIGIN', 'CARRIED');

create table public.fine_season_links (
  fine_id uuid not null references public.fines(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  link_type public.fine_season_link_type not null,
  created_at timestamptz not null default now(),
  primary key (fine_id, season_id)
);

create table public.fine_events (
  id uuid primary key default gen_random_uuid(),
  fine_id uuid not null references public.fines(id) on delete cascade,
  type public.fine_event_type not null,
  actor_user_id uuid references public.profiles(id),
  previous_amount_minor numeric,
  new_amount_minor numeric,
  scheduled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index fine_event_scheduled_unique
on public.fine_events(fine_id, type, scheduled_at)
where scheduled_at is not null;

create index fine_events_timeline_idx
on public.fine_events(fine_id, created_at desc);

alter table public.season_members enable row level security;
alter table public.rules enable row level security;
alter table public.fines enable row level security;
alter table public.fine_season_links enable row level security;
alter table public.fine_events enable row level security;

create policy "members read team season roster"
on public.season_members for select
to authenticated
using (
  exists (
    select 1
    from public.seasons s
    where s.id = season_members.season_id
      and public.is_team_member(s.team_id)
  )
);

create policy "members read team rules"
on public.rules for select
to authenticated
using (public.is_team_member(team_id));

create policy "members read team fines"
on public.fines for select
to authenticated
using (public.is_team_member(team_id));

create policy "members read team fine season links"
on public.fine_season_links for select
to authenticated
using (
  exists (
    select 1
    from public.fines f
    where f.id = fine_season_links.fine_id
      and public.is_team_member(f.team_id)
  )
);

create policy "members read team fine events"
on public.fine_events for select
to authenticated
using (
  exists (
    select 1
    from public.fines f
    where f.id = fine_events.fine_id
      and public.is_team_member(f.team_id)
  )
);

revoke all on public.season_members from anon;
revoke all on public.rules from anon;
revoke all on public.fines from anon;
revoke all on public.fine_season_links from anon;
revoke all on public.fine_events from anon;

revoke insert, update, delete on public.season_members from authenticated;
revoke insert, update, delete on public.rules from authenticated;
revoke insert, update, delete on public.fines from authenticated;
revoke insert, update, delete on public.fine_season_links from authenticated;
revoke insert, update, delete on public.fine_events from authenticated;

grant select on public.season_members to authenticated;
grant select on public.rules to authenticated;
grant select on public.fines to authenticated;
grant select on public.fine_season_links to authenticated;
grant select on public.fine_events to authenticated;

create or replace function public.accept_team_invitation(p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.team_invitations%rowtype;
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_team_member_id uuid;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  select *
  into v_invitation
  from public.team_invitations
  where id = p_invitation_id
  for update;

  if not found then
    raise exception 'INVITATION_NOT_FOUND' using errcode = '22023';
  end if;

  if v_invitation.status <> 'PENDING' then
    raise exception 'INVITATION_NOT_PENDING' using errcode = '22023';
  end if;

  if v_invitation.expires_at <= now() then
    raise exception 'INVITATION_EXPIRED' using errcode = '22023';
  end if;

  if v_email = '' or v_email <> v_invitation.email_normalized then
    raise exception 'INVITATION_EMAIL_MISMATCH' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.team_members tm
    where tm.team_id = v_invitation.team_id
      and tm.user_id = auth.uid()
      and tm.status = 'ACTIVE'
  ) then
    raise exception 'ALREADY_MEMBER' using errcode = '23505';
  end if;

  insert into public.team_members(team_id, user_id, role, status)
  values (
    v_invitation.team_id,
    auth.uid(),
    v_invitation.role::text::public.team_role,
    'ACTIVE'
  )
  returning id into v_team_member_id;

  insert into public.season_members(season_id, team_member_id)
  select s.id, v_team_member_id
  from public.seasons s
  where s.team_id = v_invitation.team_id
    and s.is_active
  on conflict (season_id, team_member_id) do nothing;

  update public.team_invitations
  set status = 'ACCEPTED', accepted_at = now()
  where id = v_invitation.id;

  update public.profiles
  set last_active_team_id = v_invitation.team_id
  where id = auth.uid();

  return v_invitation.team_id;
end;
$$;

revoke execute on function public.accept_team_invitation(uuid) from public, anon;
grant execute on function public.accept_team_invitation(uuid) to authenticated;

create or replace function public.create_rule(
  p_team_id uuid,
  p_season_id uuid,
  p_title text,
  p_description text,
  p_default_amount_minor numeric
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rule_id uuid;
  v_title text := trim(coalesce(p_title, ''));
  v_description text := nullif(trim(coalesce(p_description, '')), '');
begin
  if auth.uid() is null or not public.is_team_staff(p_team_id) then
    raise exception 'INSUFFICIENT_PERMISSION' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.seasons s
    where s.id = p_season_id
      and s.team_id = p_team_id
      and s.is_active
  ) then
    raise exception 'INVALID_ACTIVE_SEASON' using errcode = '22023';
  end if;

  if length(v_title) not between 1 and 120 then
    raise exception 'INVALID_RULE_TITLE' using errcode = '22023';
  end if;

  if v_description is not null and length(v_description) > 500 then
    raise exception 'INVALID_RULE_DESCRIPTION' using errcode = '22023';
  end if;

  if p_default_amount_minor is null
    or p_default_amount_minor <= 0
    or trunc(p_default_amount_minor) <> p_default_amount_minor then
    raise exception 'INVALID_RULE_AMOUNT' using errcode = '22023';
  end if;

  insert into public.rules(
    team_id,
    season_id,
    title,
    description,
    default_amount_minor,
    created_by
  )
  values (
    p_team_id,
    p_season_id,
    v_title,
    v_description,
    p_default_amount_minor,
    auth.uid()
  )
  returning id into v_rule_id;

  return v_rule_id;
end;
$$;

create or replace function public.update_rule(
  p_rule_id uuid,
  p_team_id uuid,
  p_season_id uuid,
  p_title text,
  p_description text,
  p_default_amount_minor numeric
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text := trim(coalesce(p_title, ''));
  v_description text := nullif(trim(coalesce(p_description, '')), '');
begin
  if auth.uid() is null or not public.is_team_staff(p_team_id) then
    raise exception 'INSUFFICIENT_PERMISSION' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.rules r
    where r.id = p_rule_id
      and r.team_id = p_team_id
  ) then
    raise exception 'RULE_NOT_FOUND' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.seasons s
    where s.id = p_season_id
      and s.team_id = p_team_id
      and s.is_active
  ) then
    raise exception 'INVALID_ACTIVE_SEASON' using errcode = '22023';
  end if;

  if length(v_title) not between 1 and 120 then
    raise exception 'INVALID_RULE_TITLE' using errcode = '22023';
  end if;

  if v_description is not null and length(v_description) > 500 then
    raise exception 'INVALID_RULE_DESCRIPTION' using errcode = '22023';
  end if;

  if p_default_amount_minor is null
    or p_default_amount_minor <= 0
    or trunc(p_default_amount_minor) <> p_default_amount_minor then
    raise exception 'INVALID_RULE_AMOUNT' using errcode = '22023';
  end if;

  update public.rules
  set season_id = p_season_id,
      title = v_title,
      description = v_description,
      default_amount_minor = p_default_amount_minor,
      updated_at = now()
  where id = p_rule_id
    and team_id = p_team_id;
end;
$$;

create or replace function public.set_rule_active(
  p_rule_id uuid,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team_id uuid;
  v_season_id uuid;
begin
  select r.team_id, r.season_id
  into v_team_id, v_season_id
  from public.rules r
  where r.id = p_rule_id
  for update;

  if not found then
    raise exception 'RULE_NOT_FOUND' using errcode = '22023';
  end if;

  if auth.uid() is null or not public.is_team_staff(v_team_id) then
    raise exception 'INSUFFICIENT_PERMISSION' using errcode = '42501';
  end if;

  if p_active and not exists (
    select 1
    from public.seasons s
    where s.id = v_season_id
      and s.team_id = v_team_id
      and s.is_active
  ) then
    raise exception 'INVALID_ACTIVE_SEASON' using errcode = '22023';
  end if;

  update public.rules
  set is_active = p_active,
      updated_at = now()
  where id = p_rule_id;
end;
$$;

revoke execute on function public.create_rule(uuid, uuid, text, text, numeric) from public, anon;
revoke execute on function public.update_rule(uuid, uuid, uuid, text, text, numeric) from public, anon;
revoke execute on function public.set_rule_active(uuid, boolean) from public, anon;

grant execute on function public.create_rule(uuid, uuid, text, text, numeric) to authenticated;
grant execute on function public.update_rule(uuid, uuid, uuid, text, text, numeric) to authenticated;
grant execute on function public.set_rule_active(uuid, boolean) to authenticated;
