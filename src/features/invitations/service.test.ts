import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ rpc })),
}))

import {
  acceptInvitation,
  cancelInvitation,
  inviteMember,
  listMyPendingInvitations,
  resendInvitation,
} from './service'

describe('invitation service', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it('normalizes email before creating an invitation', async () => {
    rpc.mockResolvedValueOnce({ data: 'invite-1', error: null })

    await expect(
      inviteMember({
        teamId: 'team-1',
        email: ' Player@Example.COM ',
        role: 'PLAYER',
      }),
    ).resolves.toEqual({ invitationId: 'invite-1' })

    expect(rpc).toHaveBeenCalledWith('invite_team_member', {
      p_team_id: 'team-1',
      p_email: 'player@example.com',
      p_role: 'PLAYER',
    })
  })

  it('lists pending invitations with team metadata', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          invitation_id: 'invite-1',
          team_id: 'team-1',
          team_name: 'FC Example',
          role: 'COACH',
          expires_at: '2026-09-17T12:00:00.000Z',
        },
      ],
      error: null,
    })

    await expect(listMyPendingInvitations()).resolves.toEqual([
      {
        id: 'invite-1',
        teamId: 'team-1',
        teamName: 'FC Example',
        role: 'COACH',
        expiresAt: '2026-09-17T12:00:00.000Z',
      },
    ])

    expect(rpc).toHaveBeenCalledWith('list_my_pending_invitations')
  })

  it('accepts an invitation and returns its team id', async () => {
    rpc.mockResolvedValueOnce({ data: 'team-1', error: null })

    await expect(acceptInvitation('invite-1')).resolves.toEqual({ teamId: 'team-1' })
    expect(rpc).toHaveBeenCalledWith('accept_team_invitation', {
      p_invitation_id: 'invite-1',
    })
  })

  it('cancels and resends invitations through staff-only RPCs', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null })
    rpc.mockResolvedValueOnce({ data: null, error: null })

    await expect(cancelInvitation('invite-1')).resolves.toBeUndefined()
    await expect(resendInvitation('invite-1')).resolves.toBeUndefined()

    expect(rpc).toHaveBeenNthCalledWith(1, 'cancel_team_invitation', {
      p_invitation_id: 'invite-1',
    })
    expect(rpc).toHaveBeenNthCalledWith(2, 'resend_team_invitation', {
      p_invitation_id: 'invite-1',
    })
  })
})
