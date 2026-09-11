import 'server-only'

import { createClient } from '@/lib/supabase/server'

export type ActiveSeason = {
  id: string
  name: string
}

export type TeamSeason = {
  id: string
  name: string
  isActive: boolean
  createdAt: string
  carriedDebtCount: number
}

type TeamSeasonRow = {
  id: string
  name: string
  is_active: boolean
  created_at: string
  fine_season_links: Array<{
    fine_id: string
    link_type: 'ORIGIN' | 'CARRIED'
  }> | null
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

export async function listTeamSeasons(teamId: string): Promise<TeamSeason[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('seasons')
    .select('id,name,is_active,created_at,fine_season_links(fine_id,link_type)')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error('Could not load team seasons.')
  }

  return ((data ?? []) as TeamSeasonRow[]).map((season) => ({
    id: season.id,
    name: season.name,
    isActive: season.is_active,
    createdAt: season.created_at,
    carriedDebtCount: (season.fine_season_links ?? []).filter(
      (link) => link.link_type === 'CARRIED',
    ).length,
  }))
}
