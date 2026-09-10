import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getActiveSeason, listRules, getTeamMembership, listMyTeams } = vi.hoisted(() => ({
  getActiveSeason: vi.fn(),
  listRules: vi.fn(),
  getTeamMembership: vi.fn(),
  listMyTeams: vi.fn(),
}))

vi.mock('@/features/seasons/service', () => ({ getActiveSeason }))
vi.mock('@/features/rules/service', () => ({ listRules }))
vi.mock('@/features/teams/service', () => ({ getTeamMembership, listMyTeams }))
vi.mock('@/features/rules/actions', () => ({
  createRuleAction: vi.fn(),
  updateRuleAction: vi.fn(),
  setRuleActiveAction: vi.fn(),
}))

import RulesPage from './page'

const activeRules = [
  {
    id: 'rule-1',
    teamId: 'team-1',
    seasonId: 'season-1',
    title: 'Late to training',
    description: 'Five minutes or more',
    defaultAmountMinor: '500',
    isActive: true,
  },
]

const allRules = [
  ...activeRules,
  {
    id: 'rule-2',
    teamId: 'team-1',
    seasonId: 'season-1',
    title: 'Old rule',
    description: null,
    defaultAmountMinor: '300',
    isActive: false,
  },
]

describe('RulesPage', () => {
  beforeEach(() => {
    getActiveSeason.mockReset()
    listRules.mockReset()
    getTeamMembership.mockReset()
    listMyTeams.mockReset()

    getActiveSeason.mockResolvedValue({ id: 'season-1', name: '2026/27' })
    listMyTeams.mockResolvedValue([
      { id: 'team-1', name: 'FC Example', currencyCode: 'EUR', role: 'OWNER' },
    ])
  })

  it('lets staff manage active and inactive rules', async () => {
    getTeamMembership.mockResolvedValue('OWNER')
    listRules.mockResolvedValue(allRules)

    render(await RulesPage({ params: Promise.resolve({ teamId: 'team-1' }) }))

    expect(screen.getByRole('heading', { name: /^rules$/i })).toBeInTheDocument()
    expect(screen.getByText('Late to training')).toBeInTheDocument()
    expect(screen.getByText('Old rule')).toBeInTheDocument()
    expect(screen.getByText('EUR 5.00')).toBeInTheDocument()
    expect(screen.getByText(/add rule/i)).toBeInTheDocument()
    expect(screen.getAllByText(/edit/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /disable late to training/i })).toBeInTheDocument()
    expect(listRules).toHaveBeenCalledWith('team-1', 'season-1', true)
  })

  it('shows only active rules without staff controls to players', async () => {
    getTeamMembership.mockResolvedValue('PLAYER')
    listRules.mockResolvedValue(activeRules)

    render(await RulesPage({ params: Promise.resolve({ teamId: 'team-1' }) }))

    expect(screen.getByText('Late to training')).toBeInTheDocument()
    expect(screen.queryByText('Old rule')).not.toBeInTheDocument()
    expect(screen.queryByText(/add rule/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /disable/i })).not.toBeInTheDocument()
    expect(listRules).toHaveBeenCalledWith('team-1', 'season-1', false)
  })
})
