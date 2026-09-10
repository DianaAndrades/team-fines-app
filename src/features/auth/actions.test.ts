import { beforeEach, describe, expect, it, vi } from 'vitest'

const signInWithOtp = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { signInWithOtp } })),
}))

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  },
}))

import { requestMagicLink } from './actions'

describe('requestMagicLink', () => {
  beforeEach(() => {
    signInWithOtp.mockReset()
    signInWithOtp.mockResolvedValue({ error: null })
  })

  it('requests an OTP with the expected callback URL', async () => {
    await expect(requestMagicLink({ email: 'alex@example.com' })).resolves.toEqual({ ok: true })

    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'alex@example.com',
      options: {
        emailRedirectTo: 'http://localhost:3000/auth/callback',
      },
    })
  })

  it('rejects invalid email before calling Supabase', async () => {
    await expect(requestMagicLink({ email: 'not-an-email' })).resolves.toEqual({
      ok: false,
      error: 'Enter a valid email.',
    })
    expect(signInWithOtp).not.toHaveBeenCalled()
  })

  it('returns a safe error when Supabase fails', async () => {
    signInWithOtp.mockResolvedValueOnce({ error: new Error('provider failed') })

    await expect(requestMagicLink({ email: 'alex@example.com' })).resolves.toEqual({
      ok: false,
      error: 'Could not send sign-in link.',
    })
  })
})
