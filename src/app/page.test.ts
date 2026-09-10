import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  requireUser,
  listMyTeams,
  getLastActiveTeamId,
  setLastActiveTeam,
  listMyPendingInvitations,
  redirect,
} = vi.hoisted(() => ({
  requireUser: vi.fn(),
  listMyTeams: vi.fn(),
  getLastActiveTeamId: vi.fn(),
  setLastActiveTeam: vi.fn(),
  listMyPendingInvitations: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock('@/lib/auth/current-user', () => ({ requireUser }))
vi.mock('@/features/teams/service', () => ({
  listMyTeams,
  getLastActiveTeamId,
  setLastActiveTeam,
}))
vi.mock('@/features/invitations/service', () => ({ listMyPendingInvitations }))
vi.mock('next/navigation', () => ({ redirect }))

import HomePage from './page'

const teams = [
  { id: 'team-1', name: 'FC Example', currencyCode: 'EUR', role: 'OWNER' },
  { id: 'team-2', name: 'Sunday XI', currencyCode: 'GBP', role: 'PLAYER' },
]

function runHomePage() {
  return Promise.resolve().then(() => HomePage())
}

describe('root team routing', () => {
  beforeEach(() => {
    requireUser.mockReset()
    listMyTeams.mockReset()
    getLastActiveTeamId.mockReset()
    setLastActiveTeam.mockReset()
    listMyPendingInvitations.mockReset()
    redirect.mockReset()

    requireUser.mockResolvedValue({ id: 'user-1' })
    setLastActiveTeam.mockResolvedValue(undefined)
    listMyPendingInvitations.mockResolvedValue([])
    redirect.mockImplementation((path: string) => {
      throw new Error(`REDIRECT:${path}`)
    })
  })

  it('sends users with a pending invitation to invitation onboarding', async () => {
    listMyTeams.mockResolvedValue([])
    listMyPendingInvitations.mockResolvedValue([
      {
        id: 'invite-1',
        teamId: 'team-1',
        teamName: 'FC Example',
        role: 'PLAYER',
        expiresAt: '2026-09-17T12:00:00.000Z',
      },
    ])

    await expect(runHomePage()).rejects.toThrow('REDIRECT:/invitations')
    expect(getLastActiveTeamId).not.toHaveBeenCalled()
  })

  it('sends users without teams or invitations to team onboarding', async () => {
    listMyTeams.mockResolvedValue([])

    await expect(runHomePage()).rejects.toThrow('REDIRECT:/teams/new')
    expect(getLastActiveTeamId).not.toHaveBeenCalled()
  })

  it('redirects to the last active team when it is still accessible', async () => {
    listMyTeams.mockResolvedValue(teams)
    getLastActiveTeamId.mockResolvedValue('team-2')

    await expect(runHomePage()).rejects.toThrow('REDIRECT:/t/team-2')
    expect(setLastActiveTeam).not.toHaveBeenCalled()
  })

  it('falls back to the first accessible team and persists it', async () => {
    listMyTeams.mockResolvedValue(teams)
    getLastActiveTeamId.mockResolvedValue('team-missing')

    await expect(runHomePage()).rejects.toThrow('REDIRECT:/t/team-1')
    expect(setLastActiveTeam).toHaveBeenCalledWith('team-1')
  })
})
