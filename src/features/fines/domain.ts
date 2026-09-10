import type { MinorUnits } from './types'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export function doubleMinorUnits(value: MinorUnits): MinorUnits {
  if (!/^\d+$/.test(value) || BigInt(value) <= 0n) {
    throw new Error('Invalid minor units')
  }

  return (BigInt(value) * 2n).toString()
}

export function nextDoublingAt(createdAt: Date): Date {
  if (Number.isNaN(createdAt.getTime())) {
    throw new Error('Invalid creation date')
  }

  return new Date(createdAt.getTime() + WEEK_MS)
}
