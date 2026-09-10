import type { FineSummary } from './types'

export type FineFilter = 'ALL' | 'PENDING' | 'DUE_SOON' | 'PAID' | 'DISPUTED'
export type FineSort = 'NEWEST' | 'HIGHEST' | 'CLOSEST_DEADLINE' | 'PLAYER'

type FineBoardOptions = {
  filter: FineFilter
  sort: FineSort
  now: Date
}

const DUE_SOON_WINDOW_MS = 24 * 60 * 60 * 1000

function isDueSoon(fine: FineSummary, now: Date) {
  if (fine.status !== 'PENDING' || !fine.nextDoublingAt) return false

  const deadline = new Date(fine.nextDoublingAt).getTime()
  const nowMs = now.getTime()

  return deadline > nowMs && deadline <= nowMs + DUE_SOON_WINDOW_MS
}

function matchesFilter(fine: FineSummary, filter: FineFilter, now: Date) {
  switch (filter) {
    case 'ALL':
      return true
    case 'PENDING':
      return fine.status === 'PENDING'
    case 'DUE_SOON':
      return isDueSoon(fine, now)
    case 'PAID':
      return fine.status === 'PAID'
    case 'DISPUTED':
      return fine.status === 'DISPUTED'
  }
}

function compareNullableDeadlines(a: FineSummary, b: FineSummary) {
  if (!a.nextDoublingAt && !b.nextDoublingAt) return 0
  if (!a.nextDoublingAt) return 1
  if (!b.nextDoublingAt) return -1

  return new Date(a.nextDoublingAt).getTime() - new Date(b.nextDoublingAt).getTime()
}

export function applyFineBoard(
  fines: FineSummary[],
  { filter, sort, now }: FineBoardOptions,
): FineSummary[] {
  const result = fines.filter((fine) => matchesFilter(fine, filter, now))

  return result.sort((a, b) => {
    switch (sort) {
      case 'NEWEST':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'HIGHEST': {
        const aAmount = BigInt(a.currentAmountMinor)
        const bAmount = BigInt(b.currentAmountMinor)
        return aAmount === bAmount ? 0 : aAmount > bAmount ? -1 : 1
      }
      case 'CLOSEST_DEADLINE':
        return compareNullableDeadlines(a, b)
      case 'PLAYER':
        return a.playerName.localeCompare(b.playerName)
    }
  })
}
