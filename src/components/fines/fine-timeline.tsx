import type { FineEvent } from '@/features/fines/types'
import { formatFineAmount } from './fine-card'

type FineTimelineProps = {
  events: FineEvent[]
  currencyCode: string
}

const EVENT_LABELS: Record<FineEvent['type'], string> = {
  CREATED: 'Fine created',
  DOUBLED: 'Amount doubled',
  DISPUTE_OPENED: 'Dispute opened',
  DISPUTE_ACCEPTED: 'Dispute accepted',
  DISPUTE_REJECTED: 'Dispute rejected',
  AMOUNT_ADJUSTED: 'Amount adjusted',
  PAID: 'Marked paid',
  CANCELLED: 'Fine cancelled',
}

function formatEventTime(value: string) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(date)
}

function eventReason(event: FineEvent) {
  const reason = event.metadata.reason
  return typeof reason === 'string' && reason.trim() ? reason.trim() : null
}

export function FineTimeline({ events, currencyCode }: FineTimelineProps) {
  if (events.length === 0) {
    return <p className="text-sm text-[#8B949E]">No history available yet.</p>
  }

  return (
    <ol className="space-y-0" aria-label="Fine history">
      {events.map((event, index) => {
        const reason = eventReason(event)
        const amountChanged =
          event.previousAmountMinor !== null &&
          event.newAmountMinor !== null &&
          event.previousAmountMinor !== event.newAmountMinor

        return (
          <li key={event.id} className="relative grid grid-cols-[20px_1fr] gap-3 pb-6 last:pb-0">
            <div className="relative flex justify-center">
              <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-[#22C55E] ring-4 ring-[#15181D]" />
              {index < events.length - 1 ? (
                <span className="absolute top-4 h-[calc(100%+0.25rem)] w-px bg-[#252A31]" />
              ) : null}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="font-medium text-[#F5F7FA]">{EVENT_LABELS[event.type]}</p>
                <time dateTime={event.createdAt} className="text-xs text-[#8B949E]">
                  {formatEventTime(event.createdAt)}
                </time>
              </div>

              {amountChanged ? (
                <p className="mt-1 text-sm text-[#8B949E]">
                  {formatFineAmount(currencyCode, event.previousAmountMinor!)} →{' '}
                  {formatFineAmount(currencyCode, event.newAmountMinor!)}
                </p>
              ) : event.newAmountMinor !== null && event.type === 'CREATED' ? (
                <p className="mt-1 text-sm text-[#8B949E]">
                  {formatFineAmount(currencyCode, event.newAmountMinor)}
                </p>
              ) : null}

              {reason ? <p className="mt-1 text-sm text-[#8B949E]">{reason}</p> : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
