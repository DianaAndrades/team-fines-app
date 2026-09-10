import { notFound } from 'next/navigation'

import { FineStatusChip } from '@/components/fines/fine-status-chip'
import { FineTimeline } from '@/components/fines/fine-timeline'
import { formatFineAmount } from '@/components/fines/fine-card'
import {
  adjustFineAction,
  cancelFineAction,
  markFinePaidAction,
} from '@/features/fines/actions'
import { getFine, listFineEvents } from '@/features/fines/service'
import { getTeamMembership, listMyTeams } from '@/features/teams/service'

function formatDeadline(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(new Date(value))
}

export default async function FineDetailPage({
  params,
}: {
  params: Promise<{ teamId: string; fineId: string }>
}) {
  const { teamId, fineId } = await params
  const [fine, role, teams] = await Promise.all([
    getFine(fineId),
    getTeamMembership(teamId),
    listMyTeams(),
  ])

  if (!fine || fine.teamId !== teamId || !role) {
    notFound()
  }

  const team = teams.find((item) => item.id === teamId)
  if (!team) {
    notFound()
  }

  const events = await listFineEvents(fineId)
  const isStaff = role === 'OWNER' || role === 'COACH'
  const canMutate = isStaff && fine.status === 'PENDING'
  const markPaid = markFinePaidAction.bind(null, teamId, fineId)
  const adjust = adjustFineAction.bind(null, teamId, fineId)
  const cancel = cancelFineAction.bind(null, teamId, fineId)

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <a
          href={`/t/${teamId}/fines`}
          className="text-sm font-medium text-[#8B949E] hover:text-[#F5F7FA]"
        >
          ← Fines
        </a>
      </div>

      <div className="rounded-2xl border border-[#252A31] bg-[#15181D] p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <FineStatusChip status={fine.status} />
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#F5F7FA]">
              {fine.playerName}
            </h1>
            <p className="mt-2 text-base text-[#8B949E]">{fine.reason}</p>
          </div>

          <div className="sm:text-right">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8B949E]">
              Current amount
            </p>
            <p className="mt-1 text-4xl font-semibold tracking-tight text-[#F5F7FA]">
              {formatFineAmount(team.currencyCode, fine.currentAmountMinor)}
            </p>
            {fine.currentAmountMinor !== fine.originalAmountMinor ? (
              <p className="mt-1 text-sm text-[#8B949E]">
                Original {formatFineAmount(team.currencyCode, fine.originalAmountMinor)}
              </p>
            ) : null}
          </div>
        </div>

        {fine.nextDoublingAt ? (
          <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-amber-200">
              Next doubling
            </p>
            <p className="mt-1 text-sm font-medium text-[#F5F7FA]">
              {formatDeadline(fine.nextDoublingAt)}
            </p>
          </div>
        ) : null}
      </div>

      {canMutate ? (
        <section aria-labelledby="fine-actions-heading" className="space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8B949E]">Staff</p>
            <h2 id="fine-actions-heading" className="mt-1 text-xl font-semibold text-[#F5F7FA]">
              Fine actions
            </h2>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <form action={markPaid} className="rounded-2xl border border-[#252A31] bg-[#15181D] p-4">
              <p className="text-sm text-[#8B949E]">Payment received externally?</p>
              <button
                type="submit"
                className="mt-4 min-h-11 w-full rounded-xl bg-[#22C55E] px-4 font-semibold text-[#0B0D10] hover:opacity-90"
              >
                Mark paid
              </button>
            </form>

            <form action={adjust} className="space-y-3 rounded-2xl border border-[#252A31] bg-[#15181D] p-4">
              <div>
                <label htmlFor="newAmountMinor" className="text-sm font-medium text-[#F5F7FA]">
                  New amount (minor units)
                </label>
                <input
                  id="newAmountMinor"
                  name="newAmountMinor"
                  inputMode="numeric"
                  pattern="[0-9]+"
                  required
                  className="mt-2 min-h-11 w-full rounded-xl border border-[#252A31] bg-[#0B0D10] px-3 text-[#F5F7FA] outline-none focus:border-[#22C55E]"
                />
                <p className="mt-1 text-xs text-[#8B949E]">
                  Example: 400 = {formatFineAmount(team.currencyCode, '400')}
                </p>
              </div>
              <div>
                <label htmlFor="adjustReason" className="text-sm font-medium text-[#F5F7FA]">
                  Adjustment reason
                </label>
                <input
                  id="adjustReason"
                  name="reason"
                  minLength={3}
                  maxLength={500}
                  required
                  className="mt-2 min-h-11 w-full rounded-xl border border-[#252A31] bg-[#0B0D10] px-3 text-[#F5F7FA] outline-none focus:border-[#22C55E]"
                />
              </div>
              <button
                type="submit"
                className="min-h-11 w-full rounded-xl border border-[#252A31] px-4 font-semibold text-[#F5F7FA] hover:bg-[#1B1F25]"
              >
                Adjust amount
              </button>
            </form>

            <form action={cancel} className="space-y-3 rounded-2xl border border-red-400/20 bg-[#15181D] p-4">
              <div>
                <label htmlFor="cancelReason" className="text-sm font-medium text-[#F5F7FA]">
                  Cancellation reason
                </label>
                <textarea
                  id="cancelReason"
                  name="reason"
                  rows={3}
                  maxLength={500}
                  required
                  className="mt-2 w-full rounded-xl border border-[#252A31] bg-[#0B0D10] px-3 py-2 text-[#F5F7FA] outline-none focus:border-red-400"
                />
              </div>
              <button
                type="submit"
                className="min-h-11 w-full rounded-xl bg-red-500/15 px-4 font-semibold text-red-200 hover:bg-red-500/20"
              >
                Cancel fine
              </button>
            </form>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="fine-history-heading" className="rounded-2xl border border-[#252A31] bg-[#15181D] p-5 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8B949E]">Audit trail</p>
        <h2 id="fine-history-heading" className="mt-1 text-xl font-semibold text-[#F5F7FA]">
          Timeline
        </h2>
        <div className="mt-6">
          <FineTimeline events={events} currencyCode={team.currencyCode} />
        </div>
      </section>
    </section>
  )
}
