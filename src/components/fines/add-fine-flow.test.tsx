import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/fines/actions', () => ({
  createRuleFineAction: vi.fn(),
  createCustomFineAction: vi.fn(),
}))

import { AddFineFlow } from './add-fine-flow'

const players = [
  { teamMemberId: 'member-1', name: 'Alex' },
  { teamMemberId: 'member-2', name: 'Bruno' },
]

const rules = [
  {
    id: 'rule-1',
    teamId: 'team-1',
    seasonId: 'season-1',
    title: 'Late to training',
    description: null,
    defaultAmountMinor: '500',
    isActive: true,
  },
]

function renderFlow() {
  return render(
    <AddFineFlow
      teamId="team-1"
      currencyCode="EUR"
      reviewStartedAt="2026-09-10T12:00:00.000Z"
      players={players}
      rules={rules}
    />,
  )
}

describe('AddFineFlow', () => {
  it('moves from player to rule to a complete review', async () => {
    const user = userEvent.setup()
    renderFlow()

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

  it('builds a custom fine in minor units without floating-point conversion', async () => {
    const user = userEvent.setup()
    const { container } = renderFlow()

    await user.click(screen.getByRole('button', { name: 'Alex' }))
    await user.click(screen.getByRole('button', { name: /custom fine/i }))
    await user.type(screen.getByLabelText(/custom reason/i), 'Forgot the kit')
    await user.type(screen.getByLabelText(/amount/i), '12.50')
    await user.click(screen.getByRole('button', { name: /continue to review/i }))

    expect(screen.getByRole('heading', { name: /review fine/i })).toBeInTheDocument()
    expect(screen.getByText('Forgot the kit')).toBeInTheDocument()
    expect(screen.getByText('EUR 12.50')).toBeInTheDocument()
    expect(screen.getByText('EUR 25.00')).toBeInTheDocument()
    expect(container.querySelector('input[name="amountMinor"]')).toHaveValue('1250')
  })
})
