import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/teams/actions', () => ({
  createTeamAction: vi.fn(),
}))

import NewTeamPage from './page'

describe('NewTeamPage', () => {
  it('renders the three-field team creation form with EUR as the default currency', () => {
    render(<NewTeamPage />)

    expect(screen.getByRole('heading', { name: /create your team/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/team name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/currency/i)).toHaveValue('EUR')
    expect(screen.getByLabelText(/current season/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create team/i })).toBeInTheDocument()
  })
})
