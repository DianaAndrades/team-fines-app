import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

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
})
