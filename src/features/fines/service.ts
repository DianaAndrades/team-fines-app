import 'server-only'

import { createClient } from '@/lib/supabase/server'
import {
  adjustFineSchema,
  createCustomFineSchema,
  createRuleFineSchema,
} from './schemas'

type RuleFineInput = {
  teamId: string
  playerTeamMemberId: string
  ruleId: string
}

type CustomFineInput = {
  teamId: string
  playerTeamMemberId: string
  reason: string
  amountMinor: string
}

type AdjustFineInput = {
  fineId: string
  newAmountMinor: string
  reason: string
}

type CancelFineInput = {
  fineId: string
  reason: string
}

function stableFineError(message?: string) {
  if (message?.includes('INSUFFICIENT_PERMISSION')) return new Error('INSUFFICIENT_PERMISSION')
  if (message?.includes('INVALID_RULE')) return new Error('INVALID_RULE')
  if (message?.includes('INVALID_PLAYER')) return new Error('INVALID_PLAYER')
  if (message?.includes('INVALID_ACTIVE_SEASON')) return new Error('INVALID_ACTIVE_SEASON')
  if (message?.includes('INVALID_CUSTOM_FINE')) return new Error('INVALID_CUSTOM_FINE')
  if (message?.includes('INVALID_FINE_STATE')) return new Error('FINE_STATE_CHANGED')
  if (message?.includes('FINE_NOT_FOUND')) return new Error('FINE_NOT_FOUND')
  return new Error('FINE_OPERATION_FAILED')
}

export async function createRuleFine(input: RuleFineInput): Promise<string> {
  const parsed = createRuleFineSchema.parse(input)
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_fine', {
    p_team_id: parsed.teamId,
    p_player_team_member_id: parsed.playerTeamMemberId,
    p_rule_id: parsed.ruleId,
    p_custom_reason: null,
    p_custom_amount_minor: null,
  })

  if (error) throw stableFineError(error.message)
  if (typeof data !== 'string' || data.length === 0) {
    throw new Error('FINE_OPERATION_FAILED')
  }

  return data
}

export async function createCustomFine(input: CustomFineInput): Promise<string> {
  const parsed = createCustomFineSchema.parse(input)
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_fine', {
    p_team_id: parsed.teamId,
    p_player_team_member_id: parsed.playerTeamMemberId,
    p_rule_id: null,
    p_custom_reason: parsed.reason,
    p_custom_amount_minor: parsed.amountMinor,
  })

  if (error) throw stableFineError(error.message)
  if (typeof data !== 'string' || data.length === 0) {
    throw new Error('FINE_OPERATION_FAILED')
  }

  return data
}

export async function markFinePaid(fineId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('mark_fine_paid', { p_fine_id: fineId })
  if (error) throw stableFineError(error.message)
}

export async function adjustFine(input: AdjustFineInput): Promise<void> {
  const parsed = adjustFineSchema.parse(input)
  const supabase = await createClient()
  const { error } = await supabase.rpc('adjust_fine_amount', {
    p_fine_id: parsed.fineId,
    p_new_amount_minor: parsed.newAmountMinor,
    p_reason: parsed.reason,
  })
  if (error) throw stableFineError(error.message)
}

export async function cancelFine(input: CancelFineInput): Promise<void> {
  const reason = input.reason.trim()
  if (!reason || reason.length > 500) {
    throw new Error('INVALID_CANCELLATION_REASON')
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('cancel_fine', {
    p_fine_id: input.fineId,
    p_reason: reason,
  })
  if (error) throw stableFineError(error.message)
}
