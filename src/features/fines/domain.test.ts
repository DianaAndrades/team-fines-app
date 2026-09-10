import { describe, expect, it } from 'vitest'

import { doubleMinorUnits, nextDoublingAt } from './domain'

describe('fine domain', () => {
  it('doubles arbitrary-size minor units without floating point', () => {
    expect(doubleMinorUnits('999999999999999999999')).toBe('1999999999999999999998')
  })

  it('sets first deadline exactly seven days after creation', () => {
    expect(nextDoublingAt(new Date('2026-09-10T16:42:00.000Z')).toISOString()).toBe(
      '2026-09-17T16:42:00.000Z',
    )
  })

  it('rejects zero and malformed minor-unit strings', () => {
    expect(() => doubleMinorUnits('0')).toThrow('Invalid minor units')
    expect(() => doubleMinorUnits('1.50')).toThrow('Invalid minor units')
  })
})
