import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/fines/actions', () => ({
  createRuleFineAction: vi.fn(),
  createCustomFineAction: vi.fn(),
}))

import { AddFineFlow } from './add-fine-flow'

describe('AddFineFlow', () => {
  it('moves from player to rule to a complete review', async () => {
    const user = userEvent.setup()

    render(
      <AddFineFlow
        teamId="team-1"
        currencyCode="EUR"
        reviewStartedAt="2026-09-10T12:00:00.000Z"
        players={[
          { teamMemberId: 'member-1', name: 'Alex' },
          { teamMemberId: 'member-2', name: 'Bruno' },
        ]}
        rules={[
          {
            id: 'rule-1',
            teamId: 'team-1',
            seasonId: 'season-1',
            title: 'Late to training',
            description: null,
            defaultAmountMinor: '500',
            isActive: true,
          },
        ]}
      />,
    )

    expect(screen.getByRole('heading', { name: /select player/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Alex' }))

    expect(screen.getByRole('heading', { name: /choose reason/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /late to training/i }))

    expect(screen.getByRole('heading', { name: /review fine/i })).toBeInTheDocument()
    expect(screen.getByText('Alex')).toBeInTheDocument()
    expect(screen.getByText('Late to training')).toBeInTheDocument()
    expect(screen.getByText('EUR 5.00')).toBeInTheDocument()
    expect(screen.getByText('EUR 10.00')).toBeInTheDocument()
    expect(screen.getByText(/17 sep 2026, 12:00 utc/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm fine/i })).toBeInTheDocument()
  })
})
