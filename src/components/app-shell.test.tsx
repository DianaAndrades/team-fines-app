import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/teams/actions', () => ({
  switchTeamAction: vi.fn(),
}))

import { AppShell } from './app-shell'

describe('AppShell', () => {
  it('shows team onboarding and hides team navigation when the user has no teams', () => {
    render(
      <AppShell teams={[]} activeTeamId={null}>
        <div>Dashboard content</div>
      </AppShell>,
    )

    expect(screen.getByRole('heading', { name: /create your team/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /create team/i })).toHaveAttribute(
      'href',
      '/teams/new',
    )
    expect(screen.queryByText(/^fines$/i)).not.toBeInTheDocument()
  })

  it('renders the team switcher for authenticated users with multiple teams', () => {
    render(
      <AppShell
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
      >
        <div>Dashboard content</div>
      </AppShell>,
    )

    expect(screen.getByRole('button', { name: /switch to sunday xi/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /create team/i })).toHaveAttribute(
      'href',
      '/teams/new',
    )
    expect(screen.getByText('Dashboard content')).toBeInTheDocument()
  })
})
