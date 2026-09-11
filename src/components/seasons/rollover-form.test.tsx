import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/seasons/actions', () => ({
  startNewSeasonAction: vi.fn(),
}))

import { RolloverForm } from './rollover-form'

describe('RolloverForm', () => {
  it('defaults every rollover option on and requires a review before submission', async () => {
    const user = userEvent.setup()

    render(<RolloverForm teamId="team-123" currentSeasonName="2026/27" />)

    expect(screen.getByLabelText(/new season name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/copy players/i)).toBeChecked()
    expect(screen.getByLabelText(/copy coaches/i)).toBeChecked()
    expect(screen.getByLabelText(/copy rules/i)).toBeChecked()
    expect(screen.getByLabelText(/carry unpaid fines/i)).toBeChecked()

    await user.type(screen.getByLabelText(/new season name/i), '2027/28')
    await user.click(screen.getByRole('button', { name: /review rollover/i }))

    expect(screen.getByRole('heading', { name: /confirm new season/i })).toBeInTheDocument()
    expect(screen.getByText(/2026\/27 → 2027\/28/i)).toBeInTheDocument()
    expect(screen.getByText(/players/i)).toBeInTheDocument()
    expect(screen.getByText(/coaches/i)).toBeInTheDocument()
    expect(screen.getByText(/rules/i)).toBeInTheDocument()
    expect(screen.getByText(/unpaid fines/i)).toBeInTheDocument()
    expect(
      screen.getByText(/keep their existing amount, deadline or frozen dispute timer/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start new season/i })).toBeInTheDocument()
  })

  it('shows only the options selected by the owner in the confirmation summary', async () => {
    const user = userEvent.setup()

    render(<RolloverForm teamId="team-123" currentSeasonName="2026/27" />)

    await user.type(screen.getByLabelText(/new season name/i), '2027/28')
    await user.click(screen.getByLabelText(/copy coaches/i))
    await user.click(screen.getByLabelText(/copy rules/i))
    await user.click(screen.getByRole('button', { name: /review rollover/i }))

    const summary = screen.getByTestId('rollover-summary')
    expect(summary).toHaveTextContent('Players')
    expect(summary).toHaveTextContent('Unpaid fines')
    expect(summary).not.toHaveTextContent('Coaches')
    expect(summary).not.toHaveTextContent('Rules')
  })
})
