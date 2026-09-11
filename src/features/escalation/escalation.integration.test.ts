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
const secretKey = requiredEnv('SUPABASE_TEST_SECRET_KEY')

const admin = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function createAdminClient() {
  return createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

describe('fine escalation concurrency', () => {
  it('persists each scheduled doubling only once when two processors race', async () => {
    const suffix = crypto.randomUUID()
    const processingAt = '2026-09-10T12:00:00.000Z'
    const firstDueAt = '2026-09-03T12:00:00.000Z'
    const secondDueAt = '2026-09-10T12:00:00.000Z'

    const { data: ownerData, error: ownerError } = await admin.auth.admin.createUser({
      email: `escalation-owner-${suffix}@example.com`,
      email_confirm: true,
    })
    const { data: playerData, error: playerError } = await admin.auth.admin.createUser({
      email: `escalation-player-${suffix}@example.com`,
      email_confirm: true,
    })

    expect(ownerError).toBeNull()
    expect(playerError).toBeNull()

    if (!ownerData.user || !playerData.user) {
      throw new Error('Expected admin user fixtures to be created')
    }

    const { data: team, error: teamError } = await admin
      .from('teams')
      .insert({
        name: `Concurrency FC ${suffix.slice(0, 8)}`,
        currency_code: 'EUR',
      })
      .select('id')
      .single()

    expect(teamError).toBeNull()

    if (!team) {
      throw new Error('Expected team fixture to be created')
    }

    const { data: season, error: seasonError } = await admin
      .from('seasons')
      .insert({ team_id: team.id, name: '2026/27', is_active: true })
      .select('id')
      .single()

    expect(seasonError).toBeNull()

    if (!season) {
      throw new Error('Expected season fixture to be created')
    }

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

    if (!playerMember) {
      throw new Error('Expected player membership fixture to be created')
    }

    const { error: seasonMemberError } = await admin.from('season_members').insert({
      season_id: season.id,
      team_member_id: playerMember.id,
    })

    expect(seasonMemberError).toBeNull()

    const { data: fine, error: fineError } = await admin
      .from('fines')
      .insert({
        team_id: team.id,
        player_team_member_id: playerMember.id,
        origin_season_id: season.id,
        reason_snapshot: 'Concurrency test fine',
        original_amount_minor: 500,
        current_amount_minor: 500,
        status: 'PENDING',
        created_by: ownerData.user.id,
        created_at: '2026-08-27T12:00:00.000Z',
        next_doubling_at: firstDueAt,
      })
      .select('id')
      .single()

    expect(fineError).toBeNull()

    if (!fine) {
      throw new Error('Expected fine fixture to be created')
    }

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

    if (!finalFine) {
      throw new Error('Expected processed fine to exist')
    }

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
