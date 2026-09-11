create or replace function public.accept_fine_dispute(
  p_fine_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fine public.fines%rowtype;
  v_reason text := trim(coalesce(p_reason, ''));
  v_player_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'INSUFFICIENT_PERMISSION' using errcode = '42501';
  end if;

  select *
  into v_fine
  from public.fines
  where id = p_fine_id
  for update;

  if not found then
    raise exception 'FINE_NOT_FOUND' using errcode = '22023';
  end if;

  if not public.is_team_staff(v_fine.team_id) then
    raise exception 'INSUFFICIENT_PERMISSION' using errcode = '42501';
  end if;

  if v_fine.status <> 'DISPUTED' then
    raise exception 'INVALID_FINE_STATE' using errcode = '22023';
  end if;

  if length(v_reason) not between 3 and 1000 then
    raise exception 'INVALID_DISPUTE_REASON' using errcode = '22023';
  end if;

  select tm.user_id
  into v_player_user_id
  from public.team_members tm
  where tm.id = v_fine.player_team_member_id;

  update public.fines
  set status = 'CANCELLED',
      next_doubling_at = null,
      dispute_remaining_seconds = null,
      cancelled_at = now(),
      cancelled_by = auth.uid(),
      cancellation_reason = v_reason
  where id = p_fine_id;

  insert into public.fine_events(
    fine_id,
    type,
    actor_user_id,
    previous_amount_minor,
    new_amount_minor,
    metadata
  )
  values (
    p_fine_id,
    'DISPUTE_ACCEPTED',
    auth.uid(),
    v_fine.current_amount_minor,
    v_fine.current_amount_minor,
    jsonb_build_object('reason', v_reason)
  );

  perform public.enqueue_notification(
    v_player_user_id,
    v_fine.team_id,
    p_fine_id,
    'DISPUTE_RESOLVED',
    'Dispute accepted',
    v_reason,
    'dispute-resolved:' || p_fine_id::text || ':accepted'
  );
end;
$$;

revoke execute on function public.accept_fine_dispute(uuid, text) from public, anon;
grant execute on function public.accept_fine_dispute(uuid, text) to authenticated;
