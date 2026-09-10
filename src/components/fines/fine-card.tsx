import type { FineSummary } from '@/features/fines/types'

import { FineStatusChip } from './fine-status-chip'

const HUNDRED = BigInt(100)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatFineAmount(currencyCode: string, amountMinor: string) {
  const amount = BigInt(amountMinor)
  const major = amount / HUNDRED
  const minor = (amount % HUNDRED).toString().padStart(2, '0')
  return `${currencyCode} ${major}.${minor}`
}

function formatUtcDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

export function FineCard({
  fine,
  currencyCode,
}: {
  fine: FineSummary
  currencyCode: string
}) {
  const amountChanged = fine.currentAmountMinor !== fine.originalAmountMinor

  return (
    <article className="rounded-2xl border border-[#252A31] bg-[#15181D] p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm font-semibold text-[#F5F7FA]">{fine.playerName}</p>
          <p className="text-sm leading-6 text-[#8B949E]">{fine.reason}</p>
        </div>
        <FineStatusChip status={fine.status} />
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8B949E]">
            Current amount
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-[#F5F7FA]">
            {formatFineAmount(currencyCode, fine.currentAmountMinor)}
          </p>
          {amountChanged ? (
            <p className="mt-1 text-xs text-[#8B949E]">
              Original {formatFineAmount(currencyCode, fine.originalAmountMinor)}
            </p>
          ) : null}
        </div>

        {fine.nextDoublingAt ? (
          <div className="text-right">
            <p className="text-xs text-[#8B949E]">Next doubling</p>
            <p className="mt-1 text-sm font-medium text-amber-200">
              {formatUtcDate(fine.nextDoublingAt)}
            </p>
          </div>
        ) : null}
      </div>
    </article>
  )
}
