import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  inviteMember,
  acceptInvitation,
  cancelInvitation,
  resendInvitation,
  revalidatePath,
  redirect,
} = vi.hoisted(() => ({
  inviteMember: vi.fn(),
  acceptInvitation: vi.fn(),
  cancelInvitation: vi.fn(),
  resendInvitation: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock('./service', () => ({
  inviteMember,
  acceptInvitation,
  cancelInvitation,
  resendInvitation,
}))
vi.mock('next/cache', () => ({ revalidatePath }))
vi.mock('next/navigation', () => ({ redirect }))

import {
  acceptInvitationAction,
  cancelInvitationAction,
  inviteMemberAction,
  resendInvitationAction,
} from './actions'

describe('invitation actions', () => {
  beforeEach(() => {
    inviteMember.mockReset()
    acceptInvitation.mockReset()
    cancelInvitation.mockReset()
    resendInvitation.mockReset()
    revalidatePath.mockReset()
    redirect.mockReset()
    redirect.mockImplementation((path: string) => {
      throw new Error(`REDIRECT:${path}`)
    })
  })

  it('returns a field error for an invalid email', async () => {
    const formData = new FormData()
    formData.set('email', 'not-an-email')

    const result = await inviteMemberAction(
      'team-1',
      'PLAYER',
      { ok: false, fieldErrors: {} },
      formData,
    )

    expect(result.ok).toBe(false)
    expect(result.fieldErrors.email?.[0]).toBeTruthy()
    expect(inviteMember).not.toHaveBeenCalled()
  })

  it('creates an invitation and reports success', async () => {
    inviteMember.mockResolvedValueOnce({ invitationId: 'invite-1' })
    const formData = new FormData()
    formData.set('email', 'player@example.com')

    const result = await inviteMemberAction(
      'team-1',
      'PLAYER',
      { ok: false, fieldErrors: {} },
      formData,
    )

    expect(result).toEqual({ ok: true, fieldErrors: {} })
    expect(inviteMember).toHaveBeenCalledWith({
      teamId: 'team-1',
      email: 'player@example.com',
      role: 'PLAYER',
    })
    expect(revalidatePath).toHaveBeenCalledWith('/t/team-1/team')
  })

  it('accepts an invitation and redirects to the joined team', async () => {
    acceptInvitation.mockResolvedValueOnce({ teamId: 'team-2' })

    await expect(acceptInvitationAction('invite-2')).rejects.toThrow(
      'REDIRECT:/t/team-2',
    )
    expect(revalidatePath).toHaveBeenCalledWith('/')
    expect(revalidatePath).toHaveBeenCalledWith('/invitations')
  })

  it('cancels and resends staff invitations', async () => {
    cancelInvitation.mockResolvedValueOnce(undefined)
    resendInvitation.mockResolvedValueOnce(undefined)

    await cancelInvitationAction('team-1', 'invite-1')
    await resendInvitationAction('team-1', 'invite-1')

    expect(cancelInvitation).toHaveBeenCalledWith('invite-1')
    expect(resendInvitation).toHaveBeenCalledWith('invite-1')
    expect(revalidatePath).toHaveBeenCalledWith('/t/team-1/team')
  })
})
