import { z } from 'zod'

import { positiveMinorUnits } from '@/features/fines/schemas'

export const ruleInputSchema = z.object({
  teamId: z.string().uuid(),
  seasonId: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  defaultAmountMinor: positiveMinorUnits,
})

export type RuleInput = z.infer<typeof ruleInputSchema>
