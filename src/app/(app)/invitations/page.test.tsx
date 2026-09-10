import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { listMyPendingInvitations, acceptInvitationAction } = vi.hoisted(() => ({
  listMyPendingInvitations: vi.fn(),
  acceptInvitationAction: vi.fn(),
}))

vi.mock('@/features/invitations/service', () => ({ listMyPendingInvitations }))
vi.mock('@/features/invitations/actions', () => ({ acceptInvitationAction }))

import InvitationsPage from './page'

describe('InvitationsPage', () => {
  beforeEach(() => {
    listMyPendingInvitations.mockReset()
    acceptInvitationAction.mockReset()
  })

  it('shows pending team invitations with a join action', async () => {
    listMyPendingInvitations.mockResolvedValueOnce([
      {
        id: 'invite-1',
        teamId: 'team-1',
        teamName: 'FC Example',
        role: 'PLAYER',
        expiresAt: '2026-09-17T12:00:00.000Z',
      },
    ])

    render(await InvitationsPage())

    expect(screen.getByRole('heading', { name: /team invitations/i })).toBeInTheDocument()
    expect(screen.getByText('FC Example')).toBeInTheDocument()
    expect(screen.getByText('PLAYER')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /join team/i })).toBeInTheDocument()
  })

  it('shows an empty state when there are no pending invitations', async () => {
    listMyPendingInvitations.mockResolvedValueOnce([])

    render(await InvitationsPage())

    expect(screen.getByText(/no pending invitations/i)).toBeInTheDocument()
  })
})
