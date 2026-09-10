import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

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

const admin = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function createAdminClient() {
  return createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function createAuthenticatedClient(email: string, password: string) {
  const { data, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError) {
    throw createError
  }

  const client = createClient(supabaseUrl, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error: signInError } = await client.auth.signInWithPassword({ email, password })

  if (signInError) {
    throw signInError
  }

  return { client, userId: data.user.id }
}

describe('fine escalation concurrency', () => {
  it('persists each scheduled doubling only once when two processors race', async () => {
    const suffix = crypto.randomUUID()
    const password = 'IntegrationTest-2026!'
    const ownerEmail = `escalation-owner-${suffix}@example.com`
    const playerEmail = `escalation-player-${suffix}@example.com`
    const processingAt = '2026-09-10T12:00:00.000Z'
    const firstDueAt = '2026-09-03T12:00:00.000Z'
    const secondDueAt = '2026-09-10T12:00:00.000Z'

    const owner = await createAuthenticatedClient(ownerEmail, password)
    const player = await createAuthenticatedClient(playerEmail, password)

    const { data: teamId, error: teamError } = await owner.client.rpc('create_team_with_owner', {
      p_name: `Concurrency FC ${suffix.slice(0, 8)}`,
      p_currency_code: 'EUR',
      p_season_name: '2026/27',
    })

    expect(teamError).toBeNull()
    expect(typeof teamId).toBe('string')

    const { data: season, error: seasonError } = await admin
      .from('seasons')
      .select('id')
      .eq('team_id', teamId)
      .eq('is_active', true)
      .single()

    expect(seasonError).toBeNull()

    const { data: playerMember, error: memberError } = await admin
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: player.userId,
        role: 'PLAYER',
        status: 'ACTIVE',
      })
      .select('id')
      .single()

    expect(memberError).toBeNull()

    const { error: seasonMemberError } = await admin.from('season_members').insert({
      season_id: season.id,
      team_member_id: playerMember.id,
    })

    expect(seasonMemberError).toBeNull()

    const { data: fine, error: fineError } = await admin
      .from('fines')
      .insert({
        team_id: teamId,
        player_team_member_id: playerMember.id,
        origin_season_id: season.id,
        reason_snapshot: 'Concurrency test fine',
        original_amount_minor: 500,
        current_amount_minor: 500,
        status: 'PENDING',
        created_by: owner.userId,
        created_at: '2026-08-27T12:00:00.000Z',
        next_doubling_at: firstDueAt,
      })
      .select('id')
      .single()

    expect(fineError).toBeNull()

    const processorA = createAdminClient()
    const processorB = createAdminClient()

    const [resultA, resultB] = await Promise.all([
      processorA.rpc('process_due_fines', { p_now: processingAt, p_limit: 200 }),
      processorB.rpc('process_due_fines', { p_now: processingAt, p_limit: 200 }),
    ])

    expect(resultA.error).toBeNull()
    expect(resultB.error).toBeNull()

    const { data: finalFine, error: finalFineError } = await admin
      .from('fines')
      .select('current_amount_minor,next_doubling_at')
      .eq('id', fine.id)
      .single()

    expect(finalFineError).toBeNull()
    expect(String(finalFine.current_amount_minor)).toBe('2000')
    expect(new Date(finalFine.next_doubling_at).toISOString()).toBe('2026-09-17T12:00:00.000Z')

    const { data: events, error: eventsError } = await admin
      .from('fine_events')
      .select('scheduled_at,new_amount_minor')
      .eq('fine_id', fine.id)
      .eq('type', 'DOUBLED')
      .order('scheduled_at', { ascending: true })

    expect(eventsError).toBeNull()
    expect(events).toHaveLength(2)
    expect(events?.map((event) => new Date(event.scheduled_at).toISOString())).toEqual([
      firstDueAt,
      secondDueAt,
    ])
    expect(events?.map((event) => String(event.new_amount_minor))).toEqual(['1000', '2000'])
  })
})
