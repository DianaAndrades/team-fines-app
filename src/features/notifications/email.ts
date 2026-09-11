import 'server-only'

import { createElement, type ReactElement } from 'react'
import { Resend } from 'resend'

import { FineNotificationEmail } from '@/emails/fine-notification'
import { TeamInvitationEmail } from '@/emails/team-invitation'
import { env } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase/admin'

export type EmailDrainResult = {
  sent: number
  failed: number
  skipped: number
}

type FineNotificationKind =
  | 'NEW_FINE'
  | 'DOUBLING_REMINDER'
  | 'FINE_DOUBLED'
  | 'DISPUTE_RESOLVED'
  | 'FINE_PAID'

type ClaimedEmail = {
  id: string
  recipient_email: string
  template_key: 'FINE_NOTIFICATION' | 'TEAM_INVITATION'
  payload: Record<string, unknown>
  idempotency_key: string
  attempt_count: number
}

type RenderedEmail = {
  subject: string
  react: ReactElement
}

const FINE_COPY: Record<
  FineNotificationKind,
  { subject: string; heading: string; preview: string }
> = {
  NEW_FINE: {
    subject: 'New team fine',
    heading: 'You received a new fine',
    preview: 'A new team fine was added to your account.',
  },
  DOUBLING_REMINDER: {
    subject: 'Your fine doubles soon',
    heading: 'Your fine doubles soon',
    preview: 'Your unpaid fine is approaching its next doubling deadline.',
  },
  FINE_DOUBLED: {
    subject: 'Your fine has doubled',
    heading: 'Your fine has doubled',
    preview: 'An unpaid team fine has reached its doubling deadline.',
  },
  DISPUTE_RESOLVED: {
    subject: 'Your fine dispute was resolved',
    heading: 'Dispute resolved',
    preview: 'Your team has resolved your fine dispute.',
  },
  FINE_PAID: {
    subject: 'Fine marked as paid',
    heading: 'Fine marked as paid',
    preview: 'Your team fine has been marked as paid.',
  },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key]
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid email payload field: ${key}`)
  }
  return value
}

function readOptionalString(
  payload: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = payload[key]
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid email payload field: ${key}`)
  }
  return value
}

function currencySymbol(currencyCode: string) {
  try {
    const currencyPart = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'narrowSymbol',
    })
      .formatToParts(0)
      .find((part) => part.type === 'currency')

    return currencyPart?.value ?? currencyCode
  } catch {
    return currencyCode
  }
}

function formatMinorAmount(currencyCode: string, amountMinor: string) {
  const zero = BigInt(0)
  const hundred = BigInt(100)
  const amount = BigInt(amountMinor)
  const negative = amount < zero
  const absolute = negative ? -amount : amount
  const major = absolute / hundred
  const minor = (absolute % hundred).toString().padStart(2, '0')
  const symbol = currencySymbol(currencyCode)
  const sign = negative ? '-' : ''

  if (symbol === currencyCode) {
    return `${sign}${currencyCode} ${major}.${minor}`
  }

  return `${sign}${symbol}${major}.${minor}`
}

function renderFineEmail(payload: Record<string, unknown>): RenderedEmail {
  const notificationType = readString(payload, 'notificationType')
  if (!(notificationType in FINE_COPY)) {
    throw new Error('Invalid fine notification type.')
  }

  const copy = FINE_COPY[notificationType as FineNotificationKind]
  const currencyCode = readString(payload, 'currencyCode')
  const currentAmount = formatMinorAmount(
    currencyCode,
    readString(payload, 'currentAmountMinor'),
  )
  const nextAmountMinor = readOptionalString(payload, 'nextAmountMinor')
  const nextAmount = nextAmountMinor
    ? formatMinorAmount(currencyCode, nextAmountMinor)
    : undefined
  const teamId = readOptionalString(payload, 'teamId')
  const fineId = readOptionalString(payload, 'fineId')
  const fineUrl =
    teamId && fineId
      ? `${env.NEXT_PUBLIC_APP_URL}/t/${teamId}/fines/${fineId}`
      : `${env.NEXT_PUBLIC_APP_URL}/notifications`

  return {
    subject: copy.subject,
    react: createElement(FineNotificationEmail, {
      preview: copy.preview,
      heading: copy.heading,
      teamName: readString(payload, 'teamName'),
      playerName: readString(payload, 'playerName'),
      reason: readString(payload, 'reason'),
      currentAmount,
      nextAmount,
      fineUrl,
    }),
  }
}

function renderInvitationEmail(payload: Record<string, unknown>): RenderedEmail {
  const teamName = readString(payload, 'teamName')
  const role = readString(payload, 'role')

  return {
    subject: `Invitation to join ${teamName}`,
    react: createElement(TeamInvitationEmail, {
      teamName,
      role,
      invitationsUrl: `${env.NEXT_PUBLIC_APP_URL}/invitations`,
    }),
  }
}

function renderClaimedEmail(email: ClaimedEmail): RenderedEmail {
  if (!isRecord(email.payload)) {
    throw new Error('Invalid email payload.')
  }

  if (email.template_key === 'FINE_NOTIFICATION') {
    return renderFineEmail(email.payload)
  }

  if (email.template_key === 'TEAM_INVITATION') {
    return renderInvitationEmail(email.payload)
  }

  throw new Error('Unsupported email template.')
}

function normalizeClaimedEmails(data: unknown): ClaimedEmail[] {
  if (!Array.isArray(data)) {
    throw new Error('Email outbox claim returned an invalid result.')
  }

  return data.map((row) => {
    if (
      !isRecord(row) ||
      typeof row.id !== 'string' ||
      typeof row.recipient_email !== 'string' ||
      (row.template_key !== 'FINE_NOTIFICATION' && row.template_key !== 'TEAM_INVITATION') ||
      !isRecord(row.payload) ||
      typeof row.idempotency_key !== 'string' ||
      typeof row.attempt_count !== 'number'
    ) {
      throw new Error('Email outbox claim returned an invalid row.')
    }

    return {
      id: row.id,
      recipient_email: row.recipient_email,
      template_key: row.template_key,
      payload: row.payload,
      idempotency_key: row.idempotency_key,
      attempt_count: row.attempt_count,
    }
  })
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  if (isRecord(error) && typeof error.message === 'string') return error.message
  return 'Email provider request failed.'
}

export async function drainEmailOutbox(limit = 100): Promise<EmailDrainResult> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    throw new Error('Invalid email drain limit.')
  }
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is required')
  }
  if (!env.RESEND_FROM_EMAIL) {
    throw new Error('RESEND_FROM_EMAIL is required')
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('claim_email_outbox', {
    p_limit: limit,
  })

  if (error) {
    throw new Error('Could not claim email outbox.')
  }

  const claimed = normalizeClaimedEmails(data)
  const resend = new Resend(env.RESEND_API_KEY)
  const result: EmailDrainResult = { sent: 0, failed: 0, skipped: 0 }

  for (const email of claimed) {
    try {
      const rendered = renderClaimedEmail(email)
      const response = await resend.emails.send(
        {
          from: env.RESEND_FROM_EMAIL,
          to: [email.recipient_email],
          subject: rendered.subject,
          react: rendered.react,
        },
        { idempotencyKey: email.idempotency_key },
      )

      if (response.error || !response.data?.id) {
        throw new Error(errorMessage(response.error))
      }

      const { error: completionError } = await supabase.rpc('complete_email_outbox', {
        p_email_id: email.id,
        p_attempt_count: email.attempt_count,
        p_provider_message_id: response.data.id,
      })

      if (completionError) {
        throw new Error('Could not complete email outbox delivery.')
      }

      result.sent += 1
    } catch (sendError) {
      const message = errorMessage(sendError)
      const { error: failureError } = await supabase.rpc('fail_email_outbox', {
        p_email_id: email.id,
        p_attempt_count: email.attempt_count,
        p_error: message,
      })

      if (failureError) {
        throw new Error('Could not record email delivery failure.')
      }

      result.failed += 1
    }
  }

  return result
}
