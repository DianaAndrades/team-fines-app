import 'server-only'

import { createClient } from '@/lib/supabase/server'

export type ActiveSeason = {
  id: string
  name: string
}

export async function getActiveSeason(teamId: string): Promise<ActiveSeason> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('seasons')
    .select('id, name')
    .eq('team_id', teamId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    throw new Error('Could not load the active season.')
  }

  if (!data) {
    throw new Error('NO_ACTIVE_SEASON')
  }

  return {
    id: data.id,
    name: data.name,
  }
}
