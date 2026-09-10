import { z } from 'zod'

export const positiveMinorUnits = z.string().regex(/^[1-9]\d*$/, 'Use positive integer minor units')

export const createRuleFineSchema = z.object({
  teamId: z.string().uuid(),
  playerTeamMemberId: z.string().uuid(),
  ruleId: z.string().uuid(),
})

export const createCustomFineSchema = z.object({
  teamId: z.string().uuid(),
  playerTeamMemberId: z.string().uuid(),
  reason: z.string().trim().min(1).max(240),
  amountMinor: positiveMinorUnits,
})

export const adjustFineSchema = z.object({
  fineId: z.string().uuid(),
  newAmountMinor: positiveMinorUnits,
  reason: z.string().trim().min(3).max(500),
})

export const fineDisputeSchema = z.object({
  fineId: z.string().uuid(),
  reason: z.string().trim().min(3).max(1000),
})
