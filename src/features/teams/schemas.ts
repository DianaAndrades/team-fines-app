import { z } from 'zod'

export const createTeamSchema = z.object({
  name: z.string().trim().min(2, 'Team name must be at least 2 characters').max(80),
  currencyCode: z.string().regex(/^[A-Z]{3}$/, 'Use a 3-letter uppercase currency code'),
  seasonName: z.string().trim().min(1, 'Season name is required').max(40),
})

export type CreateTeamInput = z.infer<typeof createTeamSchema>
