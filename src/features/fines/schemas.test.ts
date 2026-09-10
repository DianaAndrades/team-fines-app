import { describe, expect, it } from 'vitest'

import { fineDisputeSchema } from './schemas'

const fineId = '44444444-4444-4444-8444-444444444444'

describe('fineDisputeSchema', () => {
  it('trims and accepts a valid dispute reason', () => {
    expect(
      fineDisputeSchema.parse({
        fineId,
        reason: '  Training started later than scheduled  ',
      }),
    ).toEqual({
      fineId,
      reason: 'Training started later than scheduled',
    })
  })

  it('rejects invalid ids and reasons outside 3 to 1000 characters', () => {
    expect(fineDisputeSchema.safeParse({ fineId: 'fine-1', reason: 'ok' }).success).toBe(false)
    expect(fineDisputeSchema.safeParse({ fineId, reason: 'x'.repeat(1001) }).success).toBe(false)
  })
})
