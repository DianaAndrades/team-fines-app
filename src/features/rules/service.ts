import 'server-only'

import { getActiveSeason } from '@/features/seasons/service'
import { createClient } from '@/lib/supabase/server'
import type { RuleInput } from './schemas'

export { getActiveSeason }

export type RuleSummary = {
  id: string
  teamId: string
  seasonId: string
  title: string
  description: string | null
  defaultAmountMinor: string
  isActive: boolean
}

export async function listRules(
  teamId: string,
  seasonId: string,
  includeInactive = false,
): Promise<RuleSummary[]> {
  const supabase = await createClient()
  let query = supabase
    .from('rules')
    .select('id, team_id, season_id, title, description, default_amount_minor, is_active')
    .eq('team_id', teamId)
    .eq('season_id', seasonId)
    .order('created_at', { ascending: true })

  if (!includeInactive) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) {
    throw new Error('Could not load rules.')
  }

  return (data ?? []).map((rule) => ({
    id: rule.id,
    teamId: rule.team_id,
    seasonId: rule.season_id,
    title: rule.title,
    description: rule.description,
    defaultAmountMinor: String(rule.default_amount_minor),
    isActive: rule.is_active,
  }))
}

export async function createRule(input: RuleInput): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_rule', {
    p_team_id: input.teamId,
    p_season_id: input.seasonId,
    p_title: input.title,
    p_description: input.description ?? null,
    p_default_amount_minor: input.defaultAmountMinor,
  })

  if (error) {
    throw new Error(error.message || 'Could not create rule.')
  }

  if (typeof data !== 'string' || data.length === 0) {
    throw new Error('Rule creation returned an invalid id.')
  }

  return data
}

export async function updateRule(ruleId: string, input: RuleInput): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('update_rule', {
    p_rule_id: ruleId,
    p_team_id: input.teamId,
    p_season_id: input.seasonId,
    p_title: input.title,
    p_description: input.description ?? null,
    p_default_amount_minor: input.defaultAmountMinor,
  })

  if (error) {
    throw new Error(error.message || 'Could not update rule.')
  }
}

export async function setRuleActive(ruleId: string, active: boolean): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('set_rule_active', {
    p_rule_id: ruleId,
    p_active: active,
  })

  if (error) {
    throw new Error(error.message || 'Could not update rule status.')
  }
}
