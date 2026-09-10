import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/teams/actions', () => ({
  switchTeamAction: vi.fn(),
}))

import { TeamSwitcher } from './team-switcher'

describe('TeamSwitcher', () => {
  it('shows the active team, other memberships and the create-team entry', () => {
    render(
      <TeamSwitcher
        activeTeamId="team-1"
        teams={[
          {
            id: 'team-1',
            name: 'FC Example',
            currencyCode: 'EUR',
            role: 'OWNER',
          },
          {
            id: 'team-2',
            name: 'Sunday XI',
            currencyCode: 'GBP',
            role: 'PLAYER',
          },
        ]}
      />,
    )

    expect(screen.getByText('FC Example')).toBeInTheDocument()
    expect(screen.getByText('OWNER')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /switch to sunday xi/i })).toBeInTheDocument()
    expect(screen.getByText('PLAYER')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /create team/i })).toHaveAttribute(
      'href',
      '/teams/new',
    )
  })
})
