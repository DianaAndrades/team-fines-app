'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import {
  acceptInvitation,
  cancelInvitation,
  inviteMember,
  resendInvitation,
  type InvitationRole,
} from './service'

const inviteMemberFormSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
})

export type InviteMemberActionState = {
  ok: boolean
  fieldErrors: {
    email?: string[]
  }
  formError?: string
}

export async function inviteMemberAction(
  teamId: string,
  role: InvitationRole,
  _previousState: InviteMemberActionState,
  formData: FormData,
): Promise<InviteMemberActionState> {
  const parsed = inviteMemberFormSchema.safeParse({
    email: formData.get('email'),
  })

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  try {
    await inviteMember({
      teamId,
      email: parsed.data.email,
      role,
    })
  } catch (error) {
    return {
      ok: false,
      fieldErrors: {},
      formError: error instanceof Error ? error.message : 'Could not create invitation.',
    }
  }

  revalidatePath(`/t/${teamId}/team`)
  return { ok: true, fieldErrors: {} }
}

export async function acceptInvitationAction(invitationId: string): Promise<void> {
  const { teamId } = await acceptInvitation(invitationId)
  revalidatePath('/')
  revalidatePath('/invitations')
  redirect(`/t/${teamId}`)
}

export async function cancelInvitationAction(
  teamId: string,
  invitationId: string,
): Promise<void> {
  await cancelInvitation(invitationId)
  revalidatePath(`/t/${teamId}/team`)
}

export async function resendInvitationAction(
  teamId: string,
  invitationId: string,
): Promise<void> {
  await resendInvitation(invitationId)
  revalidatePath(`/t/${teamId}/team`)
}
