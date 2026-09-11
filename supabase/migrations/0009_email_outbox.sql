create type public.email_delivery_status as enum (
  'PENDING',
  'SENDING',
  'SENT',
  'FAILED'
);

alter table public.team_invitations
add column delivery_version integer not null default 1
check (delivery_version >= 1);

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  recipient_email text not null,
  template_key text not null,
  payload jsonb not null,
  idempotency_key text not null unique,
  status public.email_delivery_status not null default 'PENDING',
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  provider_message_id text,
  last_error text,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index email_outbox_delivery_idx
on public.email_outbox(next_attempt_at, created_at, id)
where status in ('PENDING', 'FAILED', 'SENDING');

alter table public.email_outbox enable row level security;

revoke all on public.email_outbox from public, anon, authenticated;
grant select, insert, update, delete on public.email_outbox to service_role;
