import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getTeamMembership, listMyTeams, listOpenDisputes, notFound } = vi.hoisted(() => ({
  getTeamMembership: vi.fn(),
  listMyTeams: vi.fn(),
  listOpenDisputes: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND')
  }),
}))

vi.mock('next/navigation', () => ({ notFound }))
vi.mock('@/features/teams/service', () => ({ getTeamMembership, listMyTeams }))
vi.mock('@/features/disputes/service', () => ({ listOpenDisputes }))
vi.mock('@/features/fines/actions', () => ({
  acceptFineDisputeAction: vi.fn(),
  rejectFineDisputeAction: vi.fn(),
}))

import DisputesPage from './page'

describe('DisputesPage', () => {
  beforeEach(() => {
    getTeamMembership.mockReset()
    listMyTeams.mockReset()
    listOpenDisputes.mockReset()
    notFound.mockClear()

    listMyTeams.mockResolvedValue([
      { id: 'team-1', name: 'FC Example', currencyCode: 'EUR', role: 'COACH' },
    ])
    listOpenDisputes.mockResolvedValue([
      {
        fineId: 'fine-1',
        teamId: 'team-1',
        playerName: 'Alex Player',
        fineReason: 'Late to training',
        disputeReason: 'Training started later than scheduled',
        currentAmountMinor: '1000',
        remainingSeconds: 172800,
        disputedAt: '2026-09-10T10:00:00Z',
      },
    ])
  })

  it('shows staff the open dispute queue with resolution controls', async () => {
    getTeamMembership.mockResolvedValue('COACH')

    render(
      await DisputesPage({
        params: Promise.resolve({ teamId: 'team-1' }),
      }),
    )

    expect(screen.getByRole('heading', { name: /disputes/i })).toBeInTheDocument()
    expect(screen.getByText('Alex Player')).toBeInTheDocument()
    expect(screen.getByText('Training started later than scheduled')).toBeInTheDocument()
    expect(screen.getByText('EUR 10.00')).toBeInTheDocument()
    expect(screen.getByText(/2d.*remaining/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /accept dispute/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reject dispute/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view fine/i })).toHaveAttribute(
      'href',
      '/t/team-1/fines/fine-1',
    )
  })

  it('blocks players before loading the staff queue', async () => {
    getTeamMembership.mockResolvedValue('PLAYER')

    await expect(
      DisputesPage({ params: Promise.resolve({ teamId: 'team-1' }) }),
    ).rejects.toThrow('NOT_FOUND')

    expect(listOpenDisputes).not.toHaveBeenCalled()
  })
})
