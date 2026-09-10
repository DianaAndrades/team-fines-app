import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { FineEvent } from '@/features/fines/types'
import { FineTimeline } from './fine-timeline'

const events: FineEvent[] = [
  {
    id: 'event-1',
    type: 'CREATED',
    actorUserId: 'coach-1',
    previousAmountMinor: null,
    newAmountMinor: '500',
    scheduledAt: null,
    createdAt: '2026-09-10T10:00:00.000Z',
    metadata: {},
  },
  {
    id: 'event-2',
    type: 'AMOUNT_ADJUSTED',
    actorUserId: 'coach-1',
    previousAmountMinor: '500',
    newAmountMinor: '400',
    scheduledAt: null,
    createdAt: '2026-09-11T10:00:00.000Z',
    metadata: { reason: 'Coach correction' },
  },
  {
    id: 'event-3',
    type: 'PAID',
    actorUserId: 'coach-1',
    previousAmountMinor: '400',
    newAmountMinor: '400',
    scheduledAt: null,
    createdAt: '2026-09-12T10:00:00.000Z',
    metadata: {},
  },
]

describe('FineTimeline', () => {
  it('renders an auditable event history with amount changes and reasons', () => {
    render(<FineTimeline events={events} currencyCode="EUR" />)

    expect(screen.getByText('Fine created')).toBeInTheDocument()
    expect(screen.getByText('Amount adjusted')).toBeInTheDocument()
    expect(screen.getByText('Coach correction')).toBeInTheDocument()
    expect(screen.getByText(/EUR 5\.00.*EUR 4\.00/i)).toBeInTheDocument()
    expect(screen.getByText('Marked paid')).toBeInTheDocument()
  })
})
