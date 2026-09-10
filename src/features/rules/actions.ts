'use server'

import { revalidatePath } from 'next/cache'

import { ruleInputSchema } from './schemas'
import { createRule, setRuleActive, updateRule } from './service'

function parseRuleForm(teamId: string, seasonId: string, formData: FormData) {
  const description = String(formData.get('description') ?? '').trim()

  return ruleInputSchema.parse({
    teamId,
    seasonId,
    title: formData.get('title'),
    description: description || undefined,
    defaultAmountMinor: formData.get('defaultAmountMinor'),
  })
}

export async function createRuleAction(
  teamId: string,
  seasonId: string,
  formData: FormData,
): Promise<void> {
  const input = parseRuleForm(teamId, seasonId, formData)
  await createRule(input)
  revalidatePath(`/t/${teamId}/rules`)
}

export async function updateRuleAction(
  ruleId: string,
  teamId: string,
  seasonId: string,
  formData: FormData,
): Promise<void> {
  const input = parseRuleForm(teamId, seasonId, formData)
  await updateRule(ruleId, input)
  revalidatePath(`/t/${teamId}/rules`)
}

export async function setRuleActiveAction(
  teamId: string,
  ruleId: string,
  active: boolean,
  _formData: FormData,
): Promise<void> {
  await setRuleActive(ruleId, active)
  revalidatePath(`/t/${teamId}/rules`)
}
