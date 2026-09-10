create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create type public.team_role as enum ('OWNER', 'COACH', 'PLAYER');
create type public.member_status as enum ('ACTIVE', 'REMOVED');

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 80),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now()
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  role public.team_role not null,
  status public.member_status not null default 'ACTIVE',
  joined_at timestamptz not null default now(),
  removed_at timestamptz
);

create unique index team_members_one_active_membership
on public.team_members(team_id, user_id)
where status = 'ACTIVE';

create unique index team_members_one_owner
on public.team_members(team_id)
where role = 'OWNER' and status = 'ACTIVE';

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 40),
  starts_at date,
  ends_at date,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create unique index seasons_one_active_per_team
on public.seasons(team_id)
where is_active;

alter table public.profiles
add column last_active_team_id uuid references public.teams(id) on delete set null;

create or replace function public.team_role_for(p_team_id uuid)
returns public.team_role
language sql
stable
security definer
set search_path = ''
as $$
  select tm.role
  from public.team_members tm
  where tm.team_id = p_team_id
    and tm.user_id = auth.uid()
    and tm.status = 'ACTIVE'
  limit 1;
$$;

create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.team_role_for(p_team_id) is not null;
$$;

create or replace function public.is_team_staff(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.team_role_for(p_team_id) in ('OWNER'::public.team_role, 'COACH'::public.team_role);
$$;

revoke execute on function public.team_role_for(uuid) from public, anon;
revoke execute on function public.is_team_member(uuid) from public, anon;
revoke execute on function public.is_team_staff(uuid) from public, anon;
grant execute on function public.team_role_for(uuid) to authenticated;
grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.is_team_staff(uuid) to authenticated;

create or replace function public.create_team_with_owner(
  p_name text,
  p_currency_code text,
  p_season_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team_id uuid;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  if length(trim(p_name)) not between 2 and 80 then
    raise exception 'INVALID_TEAM_NAME' using errcode = '22023';
  end if;

  if p_currency_code !~ '^[A-Z]{3}$' then
    raise exception 'INVALID_CURRENCY' using errcode = '22023';
  end if;

  if length(trim(p_season_name)) not between 1 and 40 then
    raise exception 'INVALID_SEASON' using errcode = '22023';
  end if;

  insert into public.teams(name, currency_code)
  values (trim(p_name), p_currency_code)
  returning id into v_team_id;

  insert into public.team_members(team_id, user_id, role)
  values (v_team_id, auth.uid(), 'OWNER');

  insert into public.seasons(team_id, name, is_active)
  values (v_team_id, trim(p_season_name), true);

  update public.profiles
  set last_active_team_id = v_team_id
  where id = auth.uid();

  return v_team_id;
end;
$$;

create or replace function public.list_my_teams()
returns table (
  team_id uuid,
  team_name text,
  currency_code text,
  role public.team_role
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.name, t.currency_code, tm.role
  from public.team_members tm
  join public.teams t on t.id = tm.team_id
  where tm.user_id = auth.uid()
    and tm.status = 'ACTIVE'
  order by t.created_at, t.id;
$$;

create or replace function public.set_last_active_team(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
      and tm.status = 'ACTIVE'
  ) then
    raise exception 'TEAM_ACCESS_DENIED' using errcode = '42501';
  end if;

  update public.profiles
  set last_active_team_id = p_team_id
  where id = auth.uid();
end;
$$;

revoke execute on function public.create_team_with_owner(text, text, text) from public, anon;
revoke execute on function public.list_my_teams() from public, anon;
revoke execute on function public.set_last_active_team(uuid) from public, anon;
grant execute on function public.create_team_with_owner(text, text, text) to authenticated;
grant execute on function public.list_my_teams() to authenticated;
grant execute on function public.set_last_active_team(uuid) to authenticated;

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.seasons enable row level security;

create policy "profile self read"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "members read teammate profiles"
on public.profiles for select
to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.team_members mine
    join public.team_members theirs on theirs.team_id = mine.team_id
    where mine.user_id = auth.uid()
      and mine.status = 'ACTIVE'
      and theirs.user_id = profiles.id
      and theirs.status = 'ACTIVE'
  )
);

create policy "profile self update"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "members read own teams"
on public.teams for select
to authenticated
using (public.is_team_member(id));

create policy "members read own roster"
on public.team_members for select
to authenticated
using (public.is_team_member(team_id));

create policy "members read own seasons"
on public.seasons for select
to authenticated
using (public.is_team_member(team_id));

revoke all on public.profiles from anon;
revoke all on public.teams from anon;
revoke all on public.team_members from anon;
revoke all on public.seasons from anon;

revoke insert, update, delete on public.teams from authenticated;
revoke insert, update, delete on public.team_members from authenticated;
revoke insert, update, delete on public.seasons from authenticated;
revoke update on public.profiles from authenticated;

grant select on public.profiles to authenticated;
grant update(display_name, avatar_url) on public.profiles to authenticated;
grant select on public.teams to authenticated;
grant select on public.team_members to authenticated;
grant select on public.seasons to authenticated;
