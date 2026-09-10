import { render, screen, within } from '@testing-library/react'
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
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
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

  it('renders complete desktop navigation and a five-entry mobile bottom navigation', () => {
    render(
      <AppShell
        activeTeamId="team-1"
        teams={[
          {
            id: 'team-1',
            name: 'FC Example',
            currencyCode: 'EUR',
            role: 'COACH',
          },
        ]}
      >
        <div>Dashboard content</div>
      </AppShell>,
    )

    const desktopNav = screen.getByRole('navigation', { name: /desktop team navigation/i })
    for (const [name, href] of [
      ['Home', '/t/team-1'],
      ['Fines', '/t/team-1/fines'],
      ['Rules', '/t/team-1/rules'],
      ['Team', '/t/team-1/team'],
      ['Notifications', '/t/team-1/notifications'],
      ['Seasons', '/t/team-1/seasons'],
      ['Settings', '/t/team-1/settings'],
    ]) {
      expect(within(desktopNav).getByRole('link', { name })).toHaveAttribute('href', href)
    }

    const mobileNav = screen.getByRole('navigation', { name: /mobile team navigation/i })
    expect(within(mobileNav).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/t/team-1')
    expect(within(mobileNav).getByRole('link', { name: 'Fines' })).toHaveAttribute('href', '/t/team-1/fines')
    expect(within(mobileNav).getByRole('link', { name: 'Rules' })).toHaveAttribute('href', '/t/team-1/rules')
    expect(within(mobileNav).getByRole('link', { name: 'Team' })).toHaveAttribute('href', '/t/team-1/team')
    expect(within(mobileNav).getByText('More')).toBeInTheDocument()
    expect(within(mobileNav).getByRole('link', { name: 'Notifications' })).toHaveAttribute(
      'href',
      '/t/team-1/notifications',
    )
    expect(within(mobileNav).getByRole('link', { name: 'Seasons' })).toHaveAttribute(
      'href',
      '/t/team-1/seasons',
    )
    expect(within(mobileNav).getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/t/team-1/settings',
    )
  })
})
