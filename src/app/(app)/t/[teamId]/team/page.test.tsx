import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getTeamMembership } = vi.hoisted(() => ({
  getTeamMembership: vi.fn(),
}))

vi.mock('@/features/teams/service', () => ({ getTeamMembership }))
vi.mock('@/components/invite-member-form', () => ({
  InviteMemberForm: ({ role }: { role: 'PLAYER' | 'COACH' }) => (
    <div>Invite {role.toLowerCase()}</div>
  ),
}))

import TeamPage from './page'

describe('TeamPage', () => {
  beforeEach(() => {
    getTeamMembership.mockReset()
  })

  it('shows player and coach invitation controls to staff', async () => {
    getTeamMembership.mockResolvedValueOnce('OWNER')

    render(await TeamPage({ params: Promise.resolve({ teamId: 'team-1' }) }))

    expect(screen.getByRole('heading', { name: /^team$/i })).toBeInTheDocument()
    expect(screen.getByText('Invite player')).toBeInTheDocument()
    expect(screen.getByText('Invite coach')).toBeInTheDocument()
  })

  it('does not show invitation controls to players', async () => {
    getTeamMembership.mockResolvedValueOnce('PLAYER')

    render(await TeamPage({ params: Promise.resolve({ teamId: 'team-1' }) }))

    expect(screen.queryByText('Invite player')).not.toBeInTheDocument()
    expect(screen.queryByText('Invite coach')).not.toBeInTheDocument()
    expect(screen.getByText(/only team staff can invite/i)).toBeInTheDocument()
  })
})
