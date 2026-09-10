import { describe, expect, it } from 'vitest'
import { createTeamSchema } from './schemas'

describe('createTeamSchema', () => {
  it('accepts a valid ISO currency code', () => {
    expect(
      createTeamSchema.safeParse({
        name: 'FC Example',
        currencyCode: 'EUR',
        seasonName: '2026/27',
      }).success,
    ).toBe(true)
  })

  it('rejects a currency code that is not exactly three uppercase letters', () => {
    expect(
      createTeamSchema.safeParse({
        name: 'FC Example',
        currencyCode: 'EURO',
        seasonName: '2026/27',
      }).success,
    ).toBe(false)
  })

  it('rejects a blank team name', () => {
    expect(
      createTeamSchema.safeParse({
        name: '   ',
        currencyCode: 'EUR',
        seasonName: '2026/27',
      }).success,
    ).toBe(false)
  })
})
