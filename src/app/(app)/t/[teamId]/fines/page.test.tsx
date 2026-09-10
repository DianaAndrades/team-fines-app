import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { listTeamFines, getTeamMembership, listMyTeams } = vi.hoisted(() => ({
  listTeamFines: vi.fn(),
  getTeamMembership: vi.fn(),
  listMyTeams: vi.fn(),
}))

vi.mock('@/features/fines/service', () => ({ listTeamFines }))
vi.mock('@/features/teams/service', () => ({ getTeamMembership, listMyTeams }))

import FinesPage from './page'

const fines = [
  {
    id: 'fine-1',
    teamId: 'team-1',
    playerTeamMemberId: 'member-1',
    playerName: 'Alex',
    reason: 'Late to training',
    originalAmountMinor: '500',
    currentAmountMinor: '500',
    status: 'PENDING' as const,
    createdAt: '2026-09-10T10:00:00.000Z',
    nextDoublingAt: '2026-09-17T10:00:00.000Z',
  },
]

describe('FinesPage', () => {
  beforeEach(() => {
    listTeamFines.mockReset()
    getTeamMembership.mockReset()
    listMyTeams.mockReset()

    listTeamFines.mockResolvedValue(fines)
    listMyTeams.mockResolvedValue([
      { id: 'team-1', name: 'FC Example', currencyCode: 'EUR', role: 'COACH' },
    ])
  })

  it('renders the staff fine board with filters, sorting and add-fine access', async () => {
    getTeamMembership.mockResolvedValue('COACH')

    render(
      await FinesPage({
        params: Promise.resolve({ teamId: 'team-1' }),
        searchParams: Promise.resolve({}),
      }),
    )

    expect(screen.getByRole('heading', { name: /^fines$/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /add fine/i })).toHaveAttribute(
      'href',
      '/t/team-1/fines/new',
    )
    expect(screen.getByRole('link', { name: /^all$/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^pending$/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /due soon/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^paid$/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^disputed$/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/sort fines/i)).toHaveValue('NEWEST')
    expect(screen.getByText('Alex')).toBeInTheDocument()
    expect(screen.getByText('Late to training')).toBeInTheDocument()
    expect(screen.getByText('EUR 5.00')).toBeInTheDocument()
    expect(listTeamFines).toHaveBeenCalledWith('team-1')
  })
})
