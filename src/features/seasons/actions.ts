'use server'

import { getActiveSeason } from './service'

export async function getActiveSeasonAction(teamId: string) {
  return getActiveSeason(teamId)
}
