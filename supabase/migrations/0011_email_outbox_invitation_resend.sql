create or replace function public.resend_team_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.team_invitations%rowtype;
  v_team_name text;
  v_existing_user_id uuid;
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

  if not public.is_team_staff(v_invitation.team_id) then
    raise exception 'TEAM_STAFF_REQUIRED' using errcode = '42501';
  end if;

  if v_invitation.status <> 'PENDING' then
    raise exception 'INVITATION_NOT_PENDING' using errcode = '22023';
  end if;

  update public.team_invitations
  set
    expires_at = now() + interval '7 days',
    delivery_version = delivery_version + 1
  where id = p_invitation_id
  returning * into v_invitation;

  select t.name
  into v_team_name
  from public.teams t
  where t.id = v_invitation.team_id;

  select p.id
  into v_existing_user_id
  from public.profiles p
  where lower(trim(p.email)) = v_invitation.email_normalized
  order by p.created_at, p.id
  limit 1;

  perform public.enqueue_email_outbox(
    v_existing_user_id,
    v_invitation.email_normalized,
    'TEAM_INVITATION',
    jsonb_build_object(
      'teamName', v_team_name,
      'role', v_invitation.role::text
    ),
    'team-invite:' || v_invitation.id::text || ':' || v_invitation.delivery_version::text
  );
end;
$$;

revoke execute on function public.resend_team_invitation(uuid) from public, anon;
grant execute on function public.resend_team_invitation(uuid) to authenticated;
