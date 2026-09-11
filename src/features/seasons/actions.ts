'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { startNewSeason } from './rollover'
import { getActiveSeason } from './service'

const startNewSeasonSchema = z.object({
  teamId: z.string().trim().min(1, 'Team is required'),
  name: z.string().trim().min(1, 'Season name is required').max(40),
})

export type StartNewSeasonActionState =
  | undefined
  | {
      ok: false
      fieldErrors: {
        teamId?: string[]
        name?: string[]
      }
    }

export async function getActiveSeasonAction(teamId: string) {
  return getActiveSeason(teamId)
}

export async function startNewSeasonAction(
  _previousState: StartNewSeasonActionState,
  formData: FormData,
): Promise<StartNewSeasonActionState> {
  const parsed = startNewSeasonSchema.safeParse({
    teamId: formData.get('teamId'),
    name: formData.get('name'),
  })

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  await startNewSeason({
    teamId: parsed.data.teamId,
    name: parsed.data.name,
    copyPlayers: formData.get('copyPlayers') === 'on',
    copyCoaches: formData.get('copyCoaches') === 'on',
    copyRules: formData.get('copyRules') === 'on',
    carryUnpaidFines: formData.get('carryUnpaidFines') === 'on',
  })

  revalidatePath(`/t/${parsed.data.teamId}`, 'layout')
  redirect(`/t/${parsed.data.teamId}/seasons`)
}
