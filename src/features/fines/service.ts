import 'server-only'

import { createClient } from '@/lib/supabase/server'
import {
  adjustFineSchema,
  createCustomFineSchema,
  createRuleFineSchema,
} from './schemas'
import type { FineEvent, FineStatus, FineSummary } from './types'

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

type DisputeInput = {
  fineId: string
  reason: string
}

export type ActivePlayer = {
  teamMemberId: string
  name: string
}

function stableFineError(message?: string) {
  if (message?.includes('INSUFFICIENT_PERMISSION')) return new Error('INSUFFICIENT_PERMISSION')
  if (message?.includes('INVALID_RULE')) return new Error('INVALID_RULE')
  if (message?.includes('INVALID_PLAYER')) return new Error('INVALID_PLAYER')
  if (message?.includes('INVALID_ACTIVE_SEASON')) return new Error('INVALID_ACTIVE_SEASON')
  if (message?.includes('INVALID_CUSTOM_FINE')) return new Error('INVALID_CUSTOM_FINE')
  if (message?.includes('INVALID_FINE_STATE')) return new Error('FINE_STATE_CHANGED')
  if (message?.includes('FINE_NOT_FOUND')) return new Error('FINE_NOT_FOUND')
  if (message?.includes('FINE_ACCESS_DENIED')) return new Error('FINE_ACCESS_DENIED')
  if (message?.includes('TEAM_ACCESS_DENIED')) return new Error('TEAM_ACCESS_DENIED')
  return new Error('FINE_OPERATION_FAILED')
}

function mapFineRow(row: Record<string, unknown>): FineSummary {
  return {
    id: String(row.fine_id),
    teamId: String(row.team_id),
    playerTeamMemberId: String(row.player_team_member_id),
    playerName: String(row.player_name),
    reason: String(row.reason),
    originalAmountMinor: String(row.original_amount_minor),
    currentAmountMinor: String(row.current_amount_minor),
    status: row.status as FineStatus,
    createdAt: String(row.created_at),
    nextDoublingAt:
      typeof row.next_doubling_at === 'string' ? row.next_doubling_at : null,
  }
}

function mapFineEvent(row: Record<string, unknown>): FineEvent {
  return {
    id: String(row.event_id),
    type: row.type as FineEvent['type'],
    actorUserId: typeof row.actor_user_id === 'string' ? row.actor_user_id : null,
    previousAmountMinor:
      row.previous_amount_minor == null ? null : String(row.previous_amount_minor),
    newAmountMinor: row.new_amount_minor == null ? null : String(row.new_amount_minor),
    scheduledAt: typeof row.scheduled_at === 'string' ? row.scheduled_at : null,
    metadata:
      row.metadata && typeof row.metadata === 'object'
        ? (row.metadata as Record<string, unknown>)
        : {},
    createdAt: String(row.created_at),
  }
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

export async function openFineDispute(input: DisputeInput): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('open_fine_dispute', {
    p_fine_id: input.fineId,
    p_reason: input.reason,
  })
  if (error) throw stableFineError(error.message)
}

export async function acceptFineDispute(input: DisputeInput): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('accept_fine_dispute', {
    p_fine_id: input.fineId,
    p_reason: input.reason,
  })
  if (error) throw stableFineError(error.message)
}

export async function rejectFineDispute(input: DisputeInput): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('reject_fine_dispute', {
    p_fine_id: input.fineId,
    p_reason: input.reason,
  })
  if (error) throw stableFineError(error.message)
}

export async function listTeamFines(teamId: string): Promise<FineSummary[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('list_team_fines', {
    p_team_id: teamId,
  })

  if (error) throw stableFineError(error.message)
  if (!Array.isArray(data)) return []
  return data.map((row) => mapFineRow(row as Record<string, unknown>))
}

export async function getFine(fineId: string): Promise<FineSummary | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_fine_detail', {
    p_fine_id: fineId,
  })

  if (error) throw stableFineError(error.message)
  if (!Array.isArray(data) || data.length === 0) return null
  return mapFineRow(data[0] as Record<string, unknown>)
}

export async function listFineEvents(fineId: string): Promise<FineEvent[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('list_fine_events', {
    p_fine_id: fineId,
  })

  if (error) throw stableFineError(error.message)
  if (!Array.isArray(data)) return []
  return data.map((row) => mapFineEvent(row as Record<string, unknown>))
}

export async function listActivePlayers(teamId: string): Promise<ActivePlayer[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('list_active_season_players', {
    p_team_id: teamId,
  })

  if (error) throw stableFineError(error.message)
  if (!Array.isArray(data)) return []

  return data.map((row) => ({
    teamMemberId: String(row.team_member_id),
    name: String(row.player_name),
  }))
}
