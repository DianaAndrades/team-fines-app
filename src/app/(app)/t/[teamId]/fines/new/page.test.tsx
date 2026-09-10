import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getActiveSeason,
  getTeamMembership,
  listActivePlayers,
  listMyTeams,
  listRules,
  notFound,
} = vi.hoisted(() => ({
  getActiveSeason: vi.fn(),
  getTeamMembership: vi.fn(),
  listActivePlayers: vi.fn(),
  listMyTeams: vi.fn(),
  listRules: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND')
  }),
}))

vi.mock('next/navigation', () => ({ notFound }))
vi.mock('@/features/seasons/service', () => ({ getActiveSeason }))
vi.mock('@/features/teams/service', () => ({ getTeamMembership, listMyTeams }))
vi.mock('@/features/fines/service', () => ({ listActivePlayers }))
vi.mock('@/features/rules/service', () => ({ listRules }))
vi.mock('@/features/fines/actions', () => ({
  createRuleFineAction: vi.fn(),
  createCustomFineAction: vi.fn(),
}))

import NewFinePage from './page'

describe('NewFinePage', () => {
  beforeEach(() => {
    getActiveSeason.mockReset()
    getTeamMembership.mockReset()
    listActivePlayers.mockReset()
    listMyTeams.mockReset()
    listRules.mockReset()
    notFound.mockClear()

    getActiveSeason.mockResolvedValue({ id: 'season-1', name: '2026/27' })
    listActivePlayers.mockResolvedValue([{ teamMemberId: 'member-1', name: 'Alex' }])
    listRules.mockResolvedValue([
      {
        id: 'rule-1',
        teamId: 'team-1',
        seasonId: 'season-1',
        title: 'Late to training',
        description: null,
        defaultAmountMinor: '500',
        isActive: true,
      },
    ])
    listMyTeams.mockResolvedValue([
      { id: 'team-1', name: 'FC Example', currencyCode: 'EUR', role: 'COACH' },
    ])
  })

  it('loads the active roster and rules for staff', async () => {
    getTeamMembership.mockResolvedValue('COACH')

    render(await NewFinePage({ params: Promise.resolve({ teamId: 'team-1' }) }))

    expect(screen.getByRole('heading', { name: /^add fine$/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /select player/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alex' })).toBeInTheDocument()
    expect(getActiveSeason).toHaveBeenCalledWith('team-1')
    expect(listActivePlayers).toHaveBeenCalledWith('team-1')
    expect(listRules).toHaveBeenCalledWith('team-1', 'season-1', false)
  })

  it('does not expose fine creation to players', async () => {
    getTeamMembership.mockResolvedValue('PLAYER')

    await expect(
      NewFinePage({ params: Promise.resolve({ teamId: 'team-1' }) }),
    ).rejects.toThrow('NOT_FOUND')
    expect(notFound).toHaveBeenCalled()
  })
})
