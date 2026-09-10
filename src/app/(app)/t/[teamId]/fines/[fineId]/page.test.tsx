import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getFine, getTeamMembership, listFineEvents, listMyTeams, notFound } = vi.hoisted(() => ({
  getFine: vi.fn(),
  getTeamMembership: vi.fn(),
  listFineEvents: vi.fn(),
  listMyTeams: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND')
  }),
}))

vi.mock('next/navigation', () => ({ notFound }))
vi.mock('@/features/fines/service', () => ({ getFine, listFineEvents }))
vi.mock('@/features/teams/service', () => ({ getTeamMembership, listMyTeams }))
vi.mock('@/features/fines/actions', () => ({
  markFinePaidAction: vi.fn(),
  adjustFineAction: vi.fn(),
  cancelFineAction: vi.fn(),
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
    getTeamMembership.mockReset()
    listFineEvents.mockReset()
    listMyTeams.mockReset()
    notFound.mockClear()

    getFine.mockResolvedValue(pendingFine)
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

  it('shows the fine to players without staff controls', async () => {
    getTeamMembership.mockResolvedValue('PLAYER')

    render(await renderPage())

    expect(screen.getByText('Late to training')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /mark paid/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /adjust amount/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cancel fine/i })).not.toBeInTheDocument()
  })

  it('hides mutation controls when the fine is no longer pending', async () => {
    getTeamMembership.mockResolvedValue('COACH')
    getFine.mockResolvedValue({ ...pendingFine, status: 'PAID', nextDoublingAt: null })

    render(await renderPage())

    expect(screen.getByText('Paid')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /mark paid/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /adjust amount/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cancel fine/i })).not.toBeInTheDocument()
  })
})
