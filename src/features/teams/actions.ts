'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createTeam } from './service'
import { createTeamSchema } from './schemas'

export type CreateTeamActionState =
  | undefined
  | {
      ok: false
      fieldErrors: {
        name?: string[]
        currencyCode?: string[]
        seasonName?: string[]
      }
    }

export async function createTeamAction(
  _previousState: CreateTeamActionState,
  formData: FormData,
): Promise<CreateTeamActionState> {
  const parsed = createTeamSchema.safeParse({
    name: formData.get('name'),
    currencyCode: formData.get('currencyCode'),
    seasonName: formData.get('seasonName'),
  })

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const teamId = await createTeam(parsed.data)

  revalidatePath('/')
  redirect(`/t/${teamId}`)
}
