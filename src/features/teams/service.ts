import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { createTeamSchema } from './schemas'

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
