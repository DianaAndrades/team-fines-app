import { describe, expect, it } from 'vitest'

import type { FineSummary } from './types'
import { applyFineBoard, type FineFilter, type FineSort } from './board'

const NOW = new Date('2026-09-10T12:00:00.000Z')

function fine(
  id: string,
  overrides: Partial<FineSummary> = {},
): FineSummary {
  return {
    id,
    teamId: '11111111-1111-4111-8111-111111111111',
    playerTeamMemberId: '22222222-2222-4222-8222-222222222222',
    playerName: 'Player B',
    reason: 'Test fine',
    originalAmountMinor: '500',
    currentAmountMinor: '500',
    status: 'PENDING',
    createdAt: '2026-09-10T10:00:00.000Z',
    nextDoublingAt: '2026-09-17T10:00:00.000Z',
    ...overrides,
  }
}

const fines = [
  fine('pending-later', {
    playerName: 'Charlie',
    currentAmountMinor: '500',
    createdAt: '2026-09-09T10:00:00.000Z',
    nextDoublingAt: '2026-09-17T10:00:00.000Z',
  }),
  fine('due-soon', {
    playerName: 'Alex',
    currentAmountMinor: '1200',
    createdAt: '2026-09-10T11:00:00.000Z',
    nextDoublingAt: '2026-09-11T11:00:00.000Z',
  }),
  fine('paid', {
    playerName: 'Bruno',
    status: 'PAID',
    currentAmountMinor: '900',
    createdAt: '2026-09-08T10:00:00.000Z',
    nextDoublingAt: null,
  }),
  fine('disputed', {
    playerName: 'Dani',
    status: 'DISPUTED',
    currentAmountMinor: '700',
    createdAt: '2026-09-07T10:00:00.000Z',
    nextDoublingAt: null,
  }),
]

describe('applyFineBoard', () => {
  it.each<[FineFilter, string[]]>([
    ['ALL', ['due-soon', 'pending-later', 'paid', 'disputed']],
    ['PENDING', ['due-soon', 'pending-later']],
    ['DUE_SOON', ['due-soon']],
    ['PAID', ['paid']],
    ['DISPUTED', ['disputed']],
  ])('filters %s fines', (filter, expectedIds) => {
    const result = applyFineBoard(fines, { filter, sort: 'NEWEST', now: NOW })
    expect(result.map((item) => item.id)).toEqual(expectedIds)
  })

  it.each<[FineSort, string[]]>([
    ['NEWEST', ['due-soon', 'pending-later', 'paid', 'disputed']],
    ['HIGHEST', ['due-soon', 'paid', 'disputed', 'pending-later']],
    ['CLOSEST_DEADLINE', ['due-soon', 'pending-later', 'paid', 'disputed']],
    ['PLAYER', ['due-soon', 'paid', 'pending-later', 'disputed']],
  ])('sorts by %s', (sort, expectedIds) => {
    const result = applyFineBoard(fines, { filter: 'ALL', sort, now: NOW })
    expect(result.map((item) => item.id)).toEqual(expectedIds)
  })

  it('does not treat an already missed deadline as due soon', () => {
    const result = applyFineBoard(
      [
        fine('missed', { nextDoublingAt: '2026-09-10T11:59:59.000Z' }),
        fine('future', { nextDoublingAt: '2026-09-10T12:00:01.000Z' }),
      ],
      { filter: 'DUE_SOON', sort: 'NEWEST', now: NOW },
    )

    expect(result.map((item) => item.id)).toEqual(['future'])
  })
})
