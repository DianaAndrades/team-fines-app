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

async function createAuthenticatedClient(email: string, password: string) {
  const { error: createError } = await admin.auth.admin.createUser({
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

  return client
}

describe('team invitation RPC flow', () => {
  it('lets staff invite a user who can see and accept the invitation', async () => {
    const password = 'IntegrationTest-2026!'
    const ownerEmail = 'owner.integration@example.com'
    const inviteeEmail = 'player.integration@example.com'
    const owner = await createAuthenticatedClient(ownerEmail, password)
    const invitee = await createAuthenticatedClient(inviteeEmail, password)

    const { data: teamId, error: teamError } = await owner.rpc('create_team_with_owner', {
      p_name: 'Integration FC',
      p_currency_code: 'EUR',
      p_season_name: '2026/27',
    })

    expect(teamError).toBeNull()
    expect(typeof teamId).toBe('string')

    const { data: invitationId, error: inviteError } = await owner.rpc('invite_team_member', {
      p_team_id: teamId,
      p_email: inviteeEmail,
      p_role: 'PLAYER',
    })

    expect(inviteError).toBeNull()
    expect(typeof invitationId).toBe('string')

    const { data: pending, error: pendingError } = await invitee.rpc(
      'list_my_pending_invitations',
    )

    expect(pendingError).toBeNull()
    expect(pending).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          invitation_id: invitationId,
          team_id: teamId,
          team_name: 'Integration FC',
          role: 'PLAYER',
        }),
      ]),
    )

    const { data: acceptedTeamId, error: acceptError } = await invitee.rpc(
      'accept_team_invitation',
      { p_invitation_id: invitationId },
    )

    expect(acceptError).toBeNull()
    expect(acceptedTeamId).toBe(teamId)

    const { data: memberships, error: teamsError } = await invitee.rpc('list_my_teams')

    expect(teamsError).toBeNull()
    expect(memberships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          team_id: teamId,
          team_name: 'Integration FC',
          currency_code: 'EUR',
          role: 'PLAYER',
        }),
      ]),
    )
  })
})
