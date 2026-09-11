import 'server-only'

import { createClient } from '@/lib/supabase/server'

export type StartNewSeasonInput = {
  teamId: string
  name: string
  copyPlayers: boolean
  copyCoaches: boolean
  copyRules: boolean
  carryUnpaidFines: boolean
}

export async function startNewSeason(input: StartNewSeasonInput): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('start_new_season', {
    p_team_id: input.teamId,
    p_name: input.name,
    p_copy_players: input.copyPlayers,
    p_copy_coaches: input.copyCoaches,
    p_copy_rules: input.copyRules,
    p_carry_unpaid_fines: input.carryUnpaidFines,
  })

  if (error) {
    throw new Error('Could not start a new season.')
  }

  if (typeof data !== 'string' || data.length === 0) {
    throw new Error('Season rollover returned an invalid id.')
  }

  return data
}
