begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

select has_type(
  'public',
  'email_delivery_status',
  'email delivery status type exists'
);

select has_table(
  'public',
  'email_outbox',
  'email outbox table exists'
);

select has_column(
  'public',
  'email_outbox',
  'idempotency_key',
  'email outbox has a stable idempotency key'
);

select col_is_unique(
  'public',
  'email_outbox',
  'idempotency_key',
  'email outbox idempotency key is unique'
);

select has_column(
  'public',
  'email_outbox',
  'attempt_count',
  'email outbox tracks attempts'
);

select has_column(
  'public',
  'email_outbox',
  'next_attempt_at',
  'email outbox stores retry timing'
);

select has_column(
  'public',
  'team_invitations',
  'delivery_version',
  'team invitations track delivery versions'
);

select col_default_is(
  'public',
  'team_invitations',
  'delivery_version',
  '1',
  'invitation delivery version starts at one'
);

select * from finish();
rollback;
