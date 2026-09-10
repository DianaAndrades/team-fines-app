import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FineCard } from './fine-card'

const pendingFine = {
  id: '44444444-4444-4444-8444-444444444444',
  teamId: '11111111-1111-4111-8111-111111111111',
  playerTeamMemberId: '22222222-2222-4222-8222-222222222222',
  playerName: 'Alex Player',
  reason: 'Late to training',
  originalAmountMinor: '500',
  currentAmountMinor: '1000',
  status: 'PENDING' as const,
  createdAt: '2026-09-10T10:00:00.000Z',
  nextDoublingAt: '2026-09-17T10:00:00.000Z',
}

describe('FineCard', () => {
  it('shows player, reason, current amount, status, original amount and next deadline', () => {
    render(<FineCard fine={pendingFine} currencyCode="EUR" />)

    expect(screen.getByText('Alex Player')).toBeInTheDocument()
    expect(screen.getByText('Late to training')).toBeInTheDocument()
    expect(screen.getByText('EUR 10.00')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText(/Original EUR 5\.00/i)).toBeInTheDocument()
    expect(screen.getByText(/17 Sep 2026/i)).toBeInTheDocument()
  })
})
