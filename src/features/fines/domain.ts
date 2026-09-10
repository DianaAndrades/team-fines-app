import type { MinorUnits } from './types'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const ZERO = BigInt(0)
const TWO = BigInt(2)

export function doubleMinorUnits(value: MinorUnits): MinorUnits {
  if (!/^\d+$/.test(value) || BigInt(value) <= ZERO) {
    throw new Error('Invalid minor units')
  }

  return (BigInt(value) * TWO).toString()
}

export function nextDoublingAt(createdAt: Date): Date {
  if (Number.isNaN(createdAt.getTime())) {
    throw new Error('Invalid creation date')
  }

  return new Date(createdAt.getTime() + WEEK_MS)
}
