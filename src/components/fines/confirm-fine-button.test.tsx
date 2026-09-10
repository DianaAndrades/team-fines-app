import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { useFormStatus } = vi.hoisted(() => ({
  useFormStatus: vi.fn(),
}))

vi.mock('react-dom', async () => {
  const actual = await vi.importActual<typeof import('react-dom')>('react-dom')
  return { ...actual, useFormStatus }
})

import { ConfirmFineButton } from './confirm-fine-button'

describe('ConfirmFineButton', () => {
  beforeEach(() => {
    useFormStatus.mockReset()
  })

  it('disables itself and shows progress while its form is submitting', () => {
    useFormStatus.mockReturnValue({
      pending: true,
      data: null,
      method: null,
      action: null,
    })

    render(<ConfirmFineButton />)

    expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled()
  })

  it('is enabled before submission', () => {
    useFormStatus.mockReturnValue({
      pending: false,
      data: null,
      method: null,
      action: null,
    })

    render(<ConfirmFineButton />)

    expect(screen.getByRole('button', { name: /confirm fine/i })).toBeEnabled()
  })
})
