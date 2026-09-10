import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  requireUser,
  listMyTeams,
  getLastActiveTeamId,
  setLastActiveTeam,
  redirect,
} = vi.hoisted(() => ({
  requireUser: vi.fn(),
  listMyTeams: vi.fn(),
  getLastActiveTeamId: vi.fn(),
  setLastActiveTeam: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock('@/lib/auth/current-user', () => ({ requireUser }))
vi.mock('@/features/teams/service', () => ({
  listMyTeams,
  getLastActiveTeamId,
  setLastActiveTeam,
}))
vi.mock('next/navigation', () => ({ redirect }))

import HomePage from './page'

const teams = [
  { id: 'team-1', name: 'FC Example', currencyCode: 'EUR', role: 'OWNER' },
  { id: 'team-2', name: 'Sunday XI', currencyCode: 'GBP', role: 'PLAYER' },
]

describe('root team routing', () => {
  beforeEach(() => {
    requireUser.mockReset()
    listMyTeams.mockReset()
    getLastActiveTeamId.mockReset()
    setLastActiveTeam.mockReset()
    redirect.mockReset()

    requireUser.mockResolvedValue({ id: 'user-1' })
    setLastActiveTeam.mockResolvedValue(undefined)
    redirect.mockImplementation((path: string) => {
      throw new Error(`REDIRECT:${path}`)
    })
  })

  it('sends users without teams to team onboarding', async () => {
    listMyTeams.mockResolvedValue([])

    await expect(HomePage()).rejects.toThrow('REDIRECT:/teams/new')
    expect(getLastActiveTeamId).not.toHaveBeenCalled()
  })

  it('redirects to the last active team when it is still accessible', async () => {
    listMyTeams.mockResolvedValue(teams)
    getLastActiveTeamId.mockResolvedValue('team-2')

    await expect(HomePage()).rejects.toThrow('REDIRECT:/t/team-2')
    expect(setLastActiveTeam).not.toHaveBeenCalled()
  })

  it('falls back to the first accessible team and persists it', async () => {
    listMyTeams.mockResolvedValue(teams)
    getLastActiveTeamId.mockResolvedValue('team-missing')

    await expect(HomePage()).rejects.toThrow('REDIRECT:/t/team-1')
    expect(setLastActiveTeam).toHaveBeenCalledWith('team-1')
  })
})
