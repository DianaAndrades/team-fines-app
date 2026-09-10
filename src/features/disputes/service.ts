import 'server-only'

import { createClient } from '@/lib/supabase/server'

export type OpenDisputeSummary = {
  fineId: string
  teamId: string
  playerName: string
  fineReason: string
  disputeReason: string
  currentAmountMinor: string
  remainingSeconds: number
  disputedAt: string
}

export async function listOpenDisputes(teamId: string): Promise<OpenDisputeSummary[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('list_open_disputes', {
    p_team_id: teamId,
  })

  if (error) {
    if (error.message?.includes('INSUFFICIENT_PERMISSION')) {
      throw new Error('INSUFFICIENT_PERMISSION')
    }
    throw new Error('DISPUTE_QUEUE_FAILED')
  }

  if (!Array.isArray(data)) return []

  return data.map((row) => ({
    fineId: String(row.fine_id),
    teamId: String(row.team_id),
    playerName: String(row.player_name),
    fineReason: String(row.fine_reason),
    disputeReason: String(row.dispute_reason),
    currentAmountMinor: String(row.current_amount_minor),
    remainingSeconds: Number(row.remaining_seconds),
    disputedAt: String(row.disputed_at),
  }))
}
