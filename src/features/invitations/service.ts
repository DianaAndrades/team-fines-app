import 'server-only'

import { createClient } from '@/lib/supabase/server'

export type InvitationRole = 'PLAYER' | 'COACH'

export type PendingInvitation = {
  id: string
  teamId: string
  teamName: string
  role: InvitationRole
  expiresAt: string
}

export async function inviteMember(input: {
  teamId: string
  email: string
  role: InvitationRole
}): Promise<{ invitationId: string }> {
  const supabase = await createClient()
  const email = input.email.trim().toLowerCase()
  const { data, error } = await supabase.rpc('invite_team_member', {
    p_team_id: input.teamId,
    p_email: email,
    p_role: input.role,
  })

  if (error) {
    throw new Error(error.message || 'Could not invite team member.')
  }

  if (typeof data !== 'string' || data.length === 0) {
    throw new Error('Invitation creation returned an invalid id.')
  }

  return { invitationId: data }
}

export async function listMyPendingInvitations(): Promise<PendingInvitation[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('list_my_pending_invitations')

  if (error) {
    throw new Error('Could not load invitations.')
  }

  if (!Array.isArray(data)) {
    return []
  }

  return data.map((invitation) => {
    if (invitation.role !== 'PLAYER' && invitation.role !== 'COACH') {
      throw new Error('Invitation returned an invalid role.')
    }

    return {
      id: invitation.invitation_id,
      teamId: invitation.team_id,
      teamName: invitation.team_name,
      role: invitation.role,
      expiresAt: invitation.expires_at,
    }
  })
}

export async function acceptInvitation(
  invitationId: string,
): Promise<{ teamId: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('accept_team_invitation', {
    p_invitation_id: invitationId,
  })

  if (error) {
    throw new Error(error.message || 'Could not accept invitation.')
  }

  if (typeof data !== 'string' || data.length === 0) {
    throw new Error('Invitation acceptance returned an invalid team id.')
  }

  return { teamId: data }
}

export async function cancelInvitation(invitationId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('cancel_team_invitation', {
    p_invitation_id: invitationId,
  })

  if (error) {
    throw new Error(error.message || 'Could not cancel invitation.')
  }
}

export async function resendInvitation(invitationId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('resend_team_invitation', {
    p_invitation_id: invitationId,
  })

  if (error) {
    throw new Error(error.message || 'Could not resend invitation.')
  }
}
