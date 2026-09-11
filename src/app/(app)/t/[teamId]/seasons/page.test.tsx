import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { listTeamSeasons, getTeamMembership } = vi.hoisted(() => ({
  listTeamSeasons: vi.fn(),
  getTeamMembership: vi.fn(),
}))

vi.mock('@/features/seasons/service', () => ({ listTeamSeasons }))
vi.mock('@/features/teams/service', () => ({ getTeamMembership }))
vi.mock('@/components/seasons/rollover-form', () => ({
  RolloverForm: ({ teamId, currentSeasonName }: { teamId: string; currentSeasonName: string }) => (
    <div data-testid="rollover-form">Rollover {teamId} from {currentSeasonName}</div>
  ),
}))

import SeasonsPage from './page'

describe('SeasonsPage', () => {
  beforeEach(() => {
    listTeamSeasons.mockReset()
    getTeamMembership.mockReset()
    listTeamSeasons.mockResolvedValue([
      {
        id: 'season-new',
        name: '2027/28',
        isActive: true,
        createdAt: '2027-07-01T10:00:00.000Z',
        carriedDebtCount: 2,
      },
      {
        id: 'season-old',
        name: '2026/27',
        isActive: false,
        createdAt: '2026-07-01T10:00:00.000Z',
        carriedDebtCount: 0,
      },
    ])
  })

  it('shows current season, history, carried debt and rollover controls to the owner', async () => {
    getTeamMembership.mockResolvedValue('OWNER')

    render(
      await SeasonsPage({
        params: Promise.resolve({ teamId: 'team-123' }),
      }),
    )

    expect(screen.getByRole('heading', { name: /^seasons$/i })).toBeInTheDocument()

    const current = screen.getByTestId('current-season')
    expect(within(current).getByText('2027/28')).toBeInTheDocument()
    expect(within(current).getByText(/2 carried fines/i)).toBeInTheDocument()

    const history = screen.getByTestId('season-history')
    expect(within(history).getByText('2026/27')).toBeInTheDocument()
    expect(within(history).getByText(/0 carried fines/i)).toBeInTheDocument()

    expect(screen.getByTestId('rollover-form')).toHaveTextContent(
      'Rollover team-123 from 2027/28',
    )
  })

  it('keeps rollover controls owner-only', async () => {
    getTeamMembership.mockResolvedValue('COACH')

    render(
      await SeasonsPage({
        params: Promise.resolve({ teamId: 'team-123' }),
      }),
    )

    expect(screen.getByText('2027/28')).toBeInTheDocument()
    expect(screen.queryByTestId('rollover-form')).not.toBeInTheDocument()
  })
})
