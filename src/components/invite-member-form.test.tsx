import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/invitations/actions', () => ({
  inviteMemberAction: vi.fn(),
}))

import { InviteMemberForm } from './invite-member-form'

describe('InviteMemberForm', () => {
  it('renders an email field and role-specific invite action', () => {
    render(<InviteMemberForm teamId="team-1" role="PLAYER" />)

    expect(screen.getByRole('heading', { name: /invite player/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/player email/i)).toHaveAttribute('type', 'email')
    expect(screen.getByRole('button', { name: /invite player/i })).toBeInTheDocument()
  })
})
