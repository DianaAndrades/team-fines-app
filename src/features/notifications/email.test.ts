import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createAdminClient, rpc, send } = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  rpc: vi.fn(),
  send: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    RESEND_API_KEY: 're_test',
    RESEND_FROM_EMAIL: 'Team Fines <fines@example.com>',
  },
}))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient }))
vi.mock('resend', () => ({
  Resend: class {
    emails = { send }
  },
}))

import { drainEmailOutbox } from './email'

type ClaimedEmail = {
  id: string
  recipient_email: string
  template_key: 'FINE_NOTIFICATION' | 'TEAM_INVITATION'
  payload: Record<string, unknown>
  idempotency_key: string
  attempt_count: number
}

function claimOnce(row: ClaimedEmail) {
  rpc.mockImplementation(async (name: string, args: Record<string, unknown>) => {
    if (name === 'claim_email_outbox') {
      expect(args).toEqual({ p_limit: 100 })
      return { data: [row], error: null }
    }

    if (name === 'complete_email_outbox' || name === 'fail_email_outbox') {
      return { data: null, error: null }
    }

    throw new Error(`Unexpected RPC: ${name}`)
  })
}

describe('email outbox dispatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createAdminClient.mockReturnValue({ rpc })
  })

  it('renders a new-fine email with player, reason, amount and team currency', async () => {
    claimOnce({
      id: 'email-1',
      recipient_email: 'alex@example.com',
      template_key: 'FINE_NOTIFICATION',
      idempotency_key: 'email:new-fine:fine-1',
      attempt_count: 1,
      payload: {
        notificationType: 'NEW_FINE',
        teamName: 'Sunday XI',
        playerName: 'Alex',
        reason: 'Late to training',
        currentAmountMinor: '500',
        currencyCode: 'EUR',
      },
    })
    send.mockResolvedValueOnce({ data: { id: 'resend-1' }, error: null })

    await expect(drainEmailOutbox()).resolves.toEqual({ sent: 1, failed: 0, skipped: 0 })

    const [message, options] = send.mock.calls[0]
    const html = renderToStaticMarkup(message.react)

    expect(message.to).toEqual(['alex@example.com'])
    expect(html).toContain('Alex')
    expect(html).toContain('Late to training')
    expect(html).toContain('€5.00')
    expect(html).toContain('Sunday XI')
    expect(options).toEqual({ idempotencyKey: 'email:new-fine:fine-1' })
    expect(rpc).toHaveBeenCalledWith('complete_email_outbox', {
      p_email_id: 'email-1',
      p_provider_message_id: 'resend-1',
    })
  })

  it('renders a doubling reminder with the current and next amounts', async () => {
    claimOnce({
      id: 'email-2',
      recipient_email: 'alex@example.com',
      template_key: 'FINE_NOTIFICATION',
      idempotency_key: 'email:doubling-reminder:fine-1:deadline',
      attempt_count: 1,
      payload: {
        notificationType: 'DOUBLING_REMINDER',
        teamName: 'Sunday XI',
        playerName: 'Alex',
        reason: 'Late to training',
        currentAmountMinor: '500',
        nextAmountMinor: '1000',
        currencyCode: 'EUR',
      },
    })
    send.mockResolvedValueOnce({ data: { id: 'resend-2' }, error: null })

    await drainEmailOutbox()

    const html = renderToStaticMarkup(send.mock.calls[0][0].react)
    expect(html).toContain('€5.00')
    expect(html).toContain('€10.00')
    expect(html).toContain('Late to training')
  })

  it('renders a team invitation with team, role and invitations CTA', async () => {
    claimOnce({
      id: 'email-3',
      recipient_email: 'coach@example.com',
      template_key: 'TEAM_INVITATION',
      idempotency_key: 'team-invite:invite-1:1',
      attempt_count: 1,
      payload: {
        teamName: 'Sunday XI',
        role: 'COACH',
      },
    })
    send.mockResolvedValueOnce({ data: { id: 'resend-3' }, error: null })

    await drainEmailOutbox()

    const html = renderToStaticMarkup(send.mock.calls[0][0].react)
    expect(html).toContain('Sunday XI')
    expect(html).toContain('COACH')
    expect(html).toContain('http://localhost:3000/invitations')
  })

  it('marks successful delivery sent with the provider message id', async () => {
    claimOnce({
      id: 'email-4',
      recipient_email: 'alex@example.com',
      template_key: 'FINE_NOTIFICATION',
      idempotency_key: 'email:fine-paid:fine-1',
      attempt_count: 2,
      payload: {
        notificationType: 'FINE_PAID',
        teamName: 'Sunday XI',
        playerName: 'Alex',
        reason: 'Late to training',
        currentAmountMinor: '500',
        currencyCode: 'EUR',
      },
    })
    send.mockResolvedValueOnce({ data: { id: 'resend-4' }, error: null })

    await drainEmailOutbox()

    expect(rpc).toHaveBeenCalledWith('complete_email_outbox', {
      p_email_id: 'email-4',
      p_provider_message_id: 'resend-4',
    })
  })

  it('leaves provider failures retryable after the claimed attempt', async () => {
    claimOnce({
      id: 'email-5',
      recipient_email: 'alex@example.com',
      template_key: 'FINE_NOTIFICATION',
      idempotency_key: 'email:fine-doubled:fine-1:deadline',
      attempt_count: 3,
      payload: {
        notificationType: 'FINE_DOUBLED',
        teamName: 'Sunday XI',
        playerName: 'Alex',
        reason: 'Late to training',
        currentAmountMinor: '1000',
        currencyCode: 'EUR',
      },
    })
    send.mockResolvedValueOnce({ data: null, error: { message: 'provider unavailable' } })

    await expect(drainEmailOutbox()).resolves.toEqual({ sent: 0, failed: 1, skipped: 0 })

    expect(rpc).toHaveBeenCalledWith('fail_email_outbox', {
      p_email_id: 'email-5',
      p_error: 'provider unavailable',
    })
  })
})
