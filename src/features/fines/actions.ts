'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import {
  adjustFineSchema,
  createCustomFineSchema,
  createRuleFineSchema,
  fineDisputeSchema,
} from './schemas'
import {
  acceptFineDispute,
  adjustFine,
  cancelFine,
  createCustomFine,
  createRuleFine,
  markFinePaid,
  openFineDispute,
  rejectFineDispute,
} from './service'

function revalidateFinePaths(teamId: string, fineId?: string) {
  revalidatePath(`/t/${teamId}/fines`)
  if (fineId) {
    revalidatePath(`/t/${teamId}/fines/${fineId}`)
  }
}

function revalidateDisputeQueue(teamId: string) {
  revalidatePath(`/t/${teamId}/disputes`)
}

function parseDisputeInput(fineId: string, formData: FormData) {
  return fineDisputeSchema.parse({
    fineId,
    reason: formData.get('reason'),
  })
}

export async function createRuleFineAction(teamId: string, formData: FormData): Promise<void> {
  const input = createRuleFineSchema.parse({
    teamId,
    playerTeamMemberId: formData.get('playerTeamMemberId'),
    ruleId: formData.get('ruleId'),
  })

  const fineId = await createRuleFine(input)
  revalidateFinePaths(teamId)
  redirect(`/t/${teamId}/fines/${fineId}`)
}

export async function createCustomFineAction(
  teamId: string,
  formData: FormData,
): Promise<void> {
  const input = createCustomFineSchema.parse({
    teamId,
    playerTeamMemberId: formData.get('playerTeamMemberId'),
    reason: formData.get('reason'),
    amountMinor: formData.get('amountMinor'),
  })

  const fineId = await createCustomFine(input)
  revalidateFinePaths(teamId)
  redirect(`/t/${teamId}/fines/${fineId}`)
}

export async function markFinePaidAction(
  teamId: string,
  fineId: string,
  _formData: FormData,
): Promise<void> {
  await markFinePaid(fineId)
  revalidateFinePaths(teamId, fineId)
}

export async function adjustFineAction(
  teamId: string,
  fineId: string,
  formData: FormData,
): Promise<void> {
  const input = adjustFineSchema.parse({
    fineId,
    newAmountMinor: formData.get('newAmountMinor'),
    reason: formData.get('reason'),
  })

  await adjustFine(input)
  revalidateFinePaths(teamId, fineId)
}

export async function cancelFineAction(
  teamId: string,
  fineId: string,
  formData: FormData,
): Promise<void> {
  const reason = String(formData.get('reason') ?? '').trim()
  await cancelFine({ fineId, reason })
  revalidateFinePaths(teamId, fineId)
}

export async function openFineDisputeAction(
  teamId: string,
  fineId: string,
  formData: FormData,
): Promise<void> {
  await openFineDispute(parseDisputeInput(fineId, formData))
  revalidateFinePaths(teamId, fineId)
}

export async function acceptFineDisputeAction(
  teamId: string,
  fineId: string,
  formData: FormData,
): Promise<void> {
  await acceptFineDispute(parseDisputeInput(fineId, formData))
  revalidateFinePaths(teamId, fineId)
  revalidateDisputeQueue(teamId)
}

export async function rejectFineDisputeAction(
  teamId: string,
  fineId: string,
  formData: FormData,
): Promise<void> {
  await rejectFineDispute(parseDisputeInput(fineId, formData))
  revalidateFinePaths(teamId, fineId)
  revalidateDisputeQueue(teamId)
}
