import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getFine,
  getTeamMemberIdForUser,
  getTeamMembership,
  listFineEvents,
  listMyTeams,
  notFound,
  requireUser,
} = vi.hoisted(() => ({
  getFine: vi.fn(),
  getTeamMemberIdForUser: vi.fn(),
  getTeamMembership: vi.fn(),
  listFineEvents: vi.fn(),
  listMyTeams: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND')
  }),
  requireUser: vi.fn(),
}))

vi.mock('next/navigation', () => ({ notFound }))
vi.mock('@/lib/auth/current-user', () => ({ requireUser }))
vi.mock('@/features/fines/service', () => ({ getFine, listFineEvents }))
vi.mock('@/features/teams/service', () => ({
  getTeamMemberIdForUser,
  getTeamMembership,
  listMyTeams,
}))
vi.mock('@/features/fines/actions', () => ({
  markFinePaidAction: vi.fn(),
  adjustFineAction: vi.fn(),
  cancelFineAction: vi.fn(),
  openFineDisputeAction: vi.fn(),
  acceptFineDisputeAction: vi.fn(),
  rejectFineDisputeAction: vi.fn(),
}))

import FineDetailPage from './page'

const pendingFine = {
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
}

const events = [
  {
    id: 'event-1',
    type: 'CREATED' as const,
    actorUserId: 'coach-1',
    previousAmountMinor: null,
    newAmountMinor: '500',
    scheduledAt: null,
    createdAt: '2026-09-10T10:00:00.000Z',
    metadata: {},
  },
]

function renderPage() {
  return FineDetailPage({
    params: Promise.resolve({ teamId: 'team-1', fineId: 'fine-1' }),
  })
}

describe('FineDetailPage', () => {
  beforeEach(() => {
    getFine.mockReset()
    getTeamMemberIdForUser.mockReset()
    getTeamMembership.mockReset()
    listFineEvents.mockReset()
    listMyTeams.mockReset()
    requireUser.mockReset()
    notFound.mockClear()

    requireUser.mockResolvedValue({ id: 'user-1' })
    getFine.mockResolvedValue(pendingFine)
    getTeamMemberIdForUser.mockResolvedValue(null)
    listFineEvents.mockResolvedValue(events)
    listMyTeams.mockResolvedValue([
      { id: 'team-1', name: 'FC Example', currencyCode: 'EUR', role: 'COACH' },
    ])
  })

  it('shows the current amount, timeline and legal staff actions for a pending fine', async () => {
    getTeamMembership.mockResolvedValue('COACH')

    render(await renderPage())

    expect(screen.getByRole('heading', { name: 'Alex' })).toBeInTheDocument()
    expect(screen.getByText('Late to training')).toBeInTheDocument()
    expect(screen.getByText('Current amount').parentElement).toHaveTextContent('EUR 5.00')
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Fine created')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mark paid/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /adjust amount/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel fine/i })).toBeInTheDocument()
  })

  it('lets the fined player dispute their own pending fine', async () => {
    getTeamMembership.mockResolvedValue('PLAYER')
    getTeamMemberIdForUser.mockResolvedValue('member-1')

    render(await renderPage())

    expect(screen.getByRole('button', { name: /dispute fine/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/why are you disputing/i)).toHaveAttribute('name', 'reason')
    expect(screen.queryByRole('button', { name: /mark paid/i })).not.toBeInTheDocument()
  })

  it('does not let another player dispute somebody else’s fine', async () => {
    getTeamMembership.mockResolvedValue('PLAYER')
    getTeamMemberIdForUser.mockResolvedValue('member-2')

    render(await renderPage())

    expect(screen.queryByRole('button', { name: /dispute fine/i })).not.toBeInTheDocument()
  })

  it('lets staff accept or reject a disputed fine and hides pending-fine mutations', async () => {
    getTeamMembership.mockResolvedValue('COACH')
    getFine.mockResolvedValue({ ...pendingFine, status: 'DISPUTED', nextDoublingAt: null })

    render(await renderPage())

    expect(screen.getByText('Disputed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /accept dispute/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reject dispute/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /mark paid/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /adjust amount/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cancel fine/i })).not.toBeInTheDocument()
  })

  it('hides mutation controls when the fine is paid', async () => {
    getTeamMembership.mockResolvedValue('COACH')
    getFine.mockResolvedValue({ ...pendingFine, status: 'PAID', nextDoublingAt: null })

    render(await renderPage())

    expect(screen.getByText('Paid')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /mark paid/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /adjust amount/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cancel fine/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /accept dispute/i })).not.toBeInTheDocument()
  })
})
