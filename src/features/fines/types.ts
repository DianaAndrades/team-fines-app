export type FineStatus = 'PENDING' | 'DISPUTED' | 'PAID' | 'CANCELLED'
export type MinorUnits = string

export type FineSummary = {
  id: string
  teamId: string
  playerTeamMemberId: string
  playerName: string
  reason: string
  originalAmountMinor: string
  currentAmountMinor: string
  status: FineStatus
  createdAt: string
  nextDoublingAt: string | null
}

export type FineEvent = {
  id: string
  type:
    | 'CREATED'
    | 'DOUBLED'
    | 'DISPUTE_OPENED'
    | 'DISPUTE_ACCEPTED'
    | 'DISPUTE_REJECTED'
    | 'AMOUNT_ADJUSTED'
    | 'PAID'
    | 'CANCELLED'
  actorUserId: string | null
  previousAmountMinor: string | null
  newAmountMinor: string | null
  scheduledAt: string | null
  createdAt: string
  metadata: Record<string, unknown>
}
