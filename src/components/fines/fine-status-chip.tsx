import type { FineStatus } from '@/features/fines/types'

const statusConfig: Record<
  FineStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: 'Pending',
    className: 'border-amber-400/25 bg-amber-400/10 text-amber-200',
  },
  DISPUTED: {
    label: 'Disputed',
    className: 'border-purple-400/25 bg-purple-400/10 text-purple-200',
  },
  PAID: {
    label: 'Paid',
    className: 'border-[#22C55E]/25 bg-[#22C55E]/10 text-[#86EFAC]',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'border-[#8B949E]/20 bg-[#8B949E]/10 text-[#AEB6BF]',
  },
}

export function FineStatusChip({ status }: { status: FineStatus }) {
  const config = statusConfig[status]

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  )
}
