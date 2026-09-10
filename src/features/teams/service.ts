import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { createTeamSchema } from './schemas'

export type TeamRole = 'OWNER' | 'COACH' | 'PLAYER'

export type MyTeam = {
  id: string
  name: string
  currencyCode: string
  role: TeamRole
}

export async function createTeam(input: {
  name: string
  currencyCode: string
  seasonName: string
}) {
  const parsed = createTeamSchema.parse(input)
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('create_team_with_owner', {
    p_name: parsed.name,
    p_currency_code: parsed.currencyCode,
    p_season_name: parsed.seasonName,
  })

  if (error) {
    throw new Error('Could not create team.')
  }

  if (typeof data !== 'string' || data.length === 0) {
    throw new Error('Team creation returned an invalid id.')
  }

  return data
}

export async function listMyTeams(): Promise<MyTeam[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('list_my_teams')

  if (error) {
    throw new Error('Could not load teams.')
  }

  if (!Array.isArray(data)) {
    return []
  }

  return data.map((team) => ({
    id: team.team_id,
    name: team.team_name,
    currencyCode: team.currency_code,
    role: team.role,
  }))
}

export async function getLastActiveTeamId(userId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('last_active_team_id')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw new Error('Could not load active team.')
  }

  return typeof data?.last_active_team_id === 'string' ? data.last_active_team_id : null
}

export async function getTeamMembership(teamId: string): Promise<TeamRole | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('team_role_for', {
    p_team_id: teamId,
  })

  if (error) {
    throw new Error('Could not verify team access.')
  }

  if (data === null) {
    return null
  }

  if (data === 'OWNER' || data === 'COACH' || data === 'PLAYER') {
    return data
  }

  throw new Error('Team membership returned an invalid role.')
}

export async function setLastActiveTeam(teamId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('set_last_active_team', {
    p_team_id: teamId,
  })

  if (error) {
    throw new Error('Could not set active team.')
  }
}
