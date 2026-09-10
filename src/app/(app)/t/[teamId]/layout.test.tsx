import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  requireUser,
  listMyTeams,
  getTeamMembership,
  setLastActiveTeam,
  notFound,
} = vi.hoisted(() => ({
  requireUser: vi.fn(),
  listMyTeams: vi.fn(),
  getTeamMembership: vi.fn(),
  setLastActiveTeam: vi.fn(),
  notFound: vi.fn(),
}))

vi.mock('@/lib/auth/current-user', () => ({ requireUser }))
vi.mock('@/features/teams/service', () => ({
  listMyTeams,
  getTeamMembership,
  setLastActiveTeam,
}))
vi.mock('@/features/teams/actions', () => ({ switchTeamAction: vi.fn() }))
vi.mock('next/navigation', () => ({ notFound }))

import TeamLayout from './layout'

const teams = [
  { id: 'team-1', name: 'FC Example', currencyCode: 'EUR', role: 'OWNER' },
]

describe('team route layout', () => {
  beforeEach(() => {
    requireUser.mockReset()
    listMyTeams.mockReset()
    getTeamMembership.mockReset()
    setLastActiveTeam.mockReset()
    notFound.mockReset()

    requireUser.mockResolvedValue({ id: 'user-1' })
    listMyTeams.mockResolvedValue(teams)
    setLastActiveTeam.mockResolvedValue(undefined)
    notFound.mockImplementation(() => {
      throw new Error('NOT_FOUND')
    })
  })

  it('rejects a team URL when the current user is not an active member', async () => {
    getTeamMembership.mockResolvedValue(null)

    await expect(
      TeamLayout({
        children: <div>Private dashboard</div>,
        params: Promise.resolve({ teamId: 'team-2' }),
      }),
    ).rejects.toThrow('NOT_FOUND')

    expect(setLastActiveTeam).not.toHaveBeenCalled()
  })

  it('persists an accessible team and renders the authenticated shell', async () => {
    getTeamMembership.mockResolvedValue('OWNER')

    const result = await TeamLayout({
      children: <div>Private dashboard</div>,
      params: Promise.resolve({ teamId: 'team-1' }),
    })

    render(result)

    expect(setLastActiveTeam).toHaveBeenCalledWith('team-1')
    expect(screen.getByText('Private dashboard')).toBeInTheDocument()
    expect(screen.getByText('FC Example')).toBeInTheDocument()
  })
})
