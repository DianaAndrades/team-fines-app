import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requireUser } = vi.hoisted(() => ({
  requireUser: vi.fn(),
}))

vi.mock('@/lib/auth/current-user', () => ({ requireUser }))

import AppLayout from './layout'

describe('authenticated app layout', () => {
  beforeEach(() => {
    requireUser.mockReset()
    requireUser.mockResolvedValue({ id: 'user-1' })
  })

  it('requires an authenticated user before rendering private app routes', async () => {
    const result = await AppLayout({ children: <div>Private app</div> })

    render(result)

    expect(requireUser).toHaveBeenCalledOnce()
    expect(screen.getByText('Private app')).toBeInTheDocument()
  })
})
