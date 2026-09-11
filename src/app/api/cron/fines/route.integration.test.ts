import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { send } = vi.hoisted(() => ({
  send: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('resend', () => ({
  Resend: class {
    emails = { send }
  },
}))

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing integration environment variable: ${name}`)
  }
  return value
}

const supabaseUrl = requiredEnv('SUPABASE_TEST_URL')
const publicKey = requiredEnv('SUPABASE_TEST_PUBLIC_KEY')
const secretKey = requiredEnv('SUPABASE_TEST_SECRET_KEY')
const cronSecret = 'cron-integration-secret-2026'

process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = publicKey
process.env.SUPABASE_SECRET_KEY = secretKey
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.RESEND_API_KEY = 're_integration_test'
process.env.RESEND_FROM_EMAIL = 'fines@example.com'
process.env.CRON_SECRET = cronSecret

const admin = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

let GET: typeof import('./route').GET

beforeAll(async () => {
  ;({ GET } = await import('./route'))
})

beforeEach(() => {
  send.mockReset()
  send.mockImplementation(async () => ({
    data: { id: `resend-${crypto.randomUUID()}` },
    error: null,
  }))
})

function cronRequest() {
  return new NextRequest('http://localhost:3000/api/cron/fines', {
    headers: { authorization: `Bearer ${cronSecret}` },
  })
}

describe('fines cron integration', () => {
  it('catches up doublings, creates one reminder, drains email and stays idempotent', async () => {
    const suffix = crypto.randomUUID()
    const playerEmail = `cron-player-${suffix}@example.com`
    const ownerEmail = `cron-owner-${suffix}@example.com`
    const seededAt = new Date()
    const oldFineCreatedAt = new Date(seededAt.getTime() - 15 * 24 * 60 * 60 * 1000)
    const oldFineFirstDueAt = new Date(oldFineCreatedAt.getTime() + 7 * 24 * 60 * 60 * 1000)
    const reminderDueAt = new Date(seededAt.getTime() + 23.5 * 60 * 60 * 1000)

    const { data: ownerData, error: ownerError } = await admin.auth.admin.createUser({
      email: ownerEmail,
      email_confirm: true,
    })
    const { data: playerData, error: playerError } = await admin.auth.admin.createUser({
      email: playerEmail,
      email_confirm: true,
    })

    expect(ownerError).toBeNull()
    expect(playerError).toBeNull()

    if (!ownerData.user || !playerData.user) {
      throw new Error('Expected cron integration users to be created')
    }

    const { error: profileError } = await admin
      .from('profiles')
      .update({ display_name: 'Cron Player' })
      .eq('id', playerData.user.id)

    expect(profileError).toBeNull()

    const { data: team, error: teamError } = await admin
      .from('teams')
      .insert({
        name: `Cron FC ${suffix.slice(0, 8)}`,
        currency_code: 'EUR',
      })
      .select('id')
      .single()

    expect(teamError).toBeNull()
    if (!team) throw new Error('Expected cron integration team to be created')

    const { data: season, error: seasonError } = await admin
      .from('seasons')
      .insert({ team_id: team.id, name: '2026/27', is_active: true })
      .select('id')
      .single()

    expect(seasonError).toBeNull()
    if (!season) throw new Error('Expected cron integration season to be created')

    const { data: playerMember, error: memberError } = await admin
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: playerData.user.id,
        role: 'PLAYER',
        status: 'ACTIVE',
      })
      .select('id')
      .single()

    expect(memberError).toBeNull()
    if (!playerMember) throw new Error('Expected cron player membership to be created')

    const { error: seasonMemberError } = await admin.from('season_members').insert({
      season_id: season.id,
      team_member_id: playerMember.id,
    })
    expect(seasonMemberError).toBeNull()

    const { data: oldFine, error: oldFineError } = await admin
      .from('fines')
      .insert({
        team_id: team.id,
        player_team_member_id: playerMember.id,
        origin_season_id: season.id,
        reason_snapshot: 'Old cron fine',
        original_amount_minor: 500,
        current_amount_minor: 500,
        status: 'PENDING',
        created_by: ownerData.user.id,
        created_at: oldFineCreatedAt.toISOString(),
        next_doubling_at: oldFineFirstDueAt.toISOString(),
      })
      .select('id')
      .single()

    expect(oldFineError).toBeNull()
    if (!oldFine) throw new Error('Expected overdue cron fine to be created')

    const { data: reminderFine, error: reminderFineError } = await admin
      .from('fines')
      .insert({
        team_id: team.id,
        player_team_member_id: playerMember.id,
        origin_season_id: season.id,
        reason_snapshot: 'Reminder cron fine',
        original_amount_minor: 700,
        current_amount_minor: 700,
        status: 'PENDING',
        created_by: ownerData.user.id,
        created_at: new Date(seededAt.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        next_doubling_at: reminderDueAt.toISOString(),
      })
      .select('id')
      .single()

    expect(reminderFineError).toBeNull()
    if (!reminderFine) throw new Error('Expected reminder cron fine to be created')

    const firstResponse = await GET(cronRequest())
    expect(firstResponse.status).toBe(200)
    const firstBody = await firstResponse.json()

    expect(firstBody).toMatchObject({
      ok: true,
      escalation: {
        doublingsApplied: 2,
      },
      reminders: {
        remindersCreated: 1,
      },
      email: {
        sent: 3,
        failed: 0,
      },
    })

    const { data: processedOldFine, error: processedFineError } = await admin
      .from('fines')
      .select('current_amount_minor,next_doubling_at')
      .eq('id', oldFine.id)
      .single()

    expect(processedFineError).toBeNull()
    expect(String(processedOldFine?.current_amount_minor)).toBe('2000')

    const { data: doubledEvents, error: eventsError } = await admin
      .from('fine_events')
      .select('id,scheduled_at,new_amount_minor')
      .eq('fine_id', oldFine.id)
      .eq('type', 'DOUBLED')
      .order('scheduled_at', { ascending: true })

    expect(eventsError).toBeNull()
    expect(doubledEvents).toHaveLength(2)
    expect(doubledEvents?.map((event) => String(event.new_amount_minor))).toEqual([
      '1000',
      '2000',
    ])

    const { data: notifications, error: notificationsError } = await admin
      .from('notifications')
      .select('id,fine_id,type,idempotency_key')
      .in('fine_id', [oldFine.id, reminderFine.id])
      .order('created_at', { ascending: true })

    expect(notificationsError).toBeNull()
    expect(notifications?.filter((item) => item.type === 'FINE_DOUBLED')).toHaveLength(2)
    expect(
      notifications?.filter(
        (item) => item.type === 'DOUBLING_REMINDER' && item.fine_id === reminderFine.id,
      ),
    ).toHaveLength(1)
    expect(new Set(notifications?.map((item) => item.idempotency_key)).size).toBe(3)

    const { data: outbox, error: outboxError } = await admin
      .from('email_outbox')
      .select('id,status,idempotency_key,recipient_email')
      .eq('recipient_email', playerEmail)
      .order('created_at', { ascending: true })

    expect(outboxError).toBeNull()
    expect(outbox).toHaveLength(3)
    expect(outbox?.every((email) => email.status === 'SENT')).toBe(true)
    expect(new Set(outbox?.map((email) => email.idempotency_key)).size).toBe(3)
    expect(send).toHaveBeenCalledTimes(3)

    const secondResponse = await GET(cronRequest())
    expect(secondResponse.status).toBe(200)
    const secondBody = await secondResponse.json()

    expect(secondBody).toMatchObject({
      ok: true,
      escalation: { doublingsApplied: 0 },
      reminders: { remindersCreated: 0 },
      email: { sent: 0, failed: 0 },
    })

    const { data: oldFineAfterSecondRun } = await admin
      .from('fines')
      .select('current_amount_minor')
      .eq('id', oldFine.id)
      .single()
    const { data: eventsAfterSecondRun } = await admin
      .from('fine_events')
      .select('id')
      .eq('fine_id', oldFine.id)
      .eq('type', 'DOUBLED')
    const { data: notificationsAfterSecondRun } = await admin
      .from('notifications')
      .select('id')
      .in('fine_id', [oldFine.id, reminderFine.id])
    const { data: outboxAfterSecondRun } = await admin
      .from('email_outbox')
      .select('id')
      .eq('recipient_email', playerEmail)

    expect(String(oldFineAfterSecondRun?.current_amount_minor)).toBe('2000')
    expect(eventsAfterSecondRun).toHaveLength(2)
    expect(notificationsAfterSecondRun).toHaveLength(3)
    expect(outboxAfterSecondRun).toHaveLength(3)
    expect(send).toHaveBeenCalledTimes(3)
  })
})
