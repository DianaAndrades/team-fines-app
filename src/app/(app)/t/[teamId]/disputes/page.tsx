import { notFound } from 'next/navigation'

import { formatFineAmount } from '@/components/fines/fine-card'
import { listOpenDisputes } from '@/features/disputes/service'
import {
  acceptFineDisputeAction,
  rejectFineDisputeAction,
} from '@/features/fines/actions'
import { getTeamMembership, listMyTeams } from '@/features/teams/service'

function formatRemaining(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const days = Math.floor(safeSeconds / 86_400)
  const hours = Math.floor((safeSeconds % 86_400) / 3_600)
  const minutes = Math.floor((safeSeconds % 3_600) / 60)

  if (days > 0) return `${days}d ${hours}h remaining`
  if (hours > 0) return `${hours}h ${minutes}m remaining`
  return `${minutes}m remaining`
}

export default async function DisputesPage({
  params,
}: {
  params: Promise<{ teamId: string }>
}) {
  const { teamId } = await params
  const role = await getTeamMembership(teamId)

  if (role !== 'OWNER' && role !== 'COACH') {
    notFound()
  }

  const [teams, disputes] = await Promise.all([
    listMyTeams(),
    listOpenDisputes(teamId),
  ])
  const team = teams.find((item) => item.id === teamId)

  if (!team) {
    notFound()
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-purple-200">
          Staff review
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#F5F7FA]">
          Disputes
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8B949E]">
          Review challenged fines. Their doubling timers remain paused until you accept or reject the dispute.
        </p>
      </div>

      {disputes.length === 0 ? (
        <div className="rounded-2xl border border-[#252A31] bg-[#15181D] p-6">
          <p className="font-medium text-[#F5F7FA]">No open disputes</p>
          <p className="mt-1 text-sm text-[#8B949E]">Nothing needs staff review right now.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((dispute) => {
            const accept = acceptFineDisputeAction.bind(null, teamId, dispute.fineId)
            const reject = rejectFineDisputeAction.bind(null, teamId, dispute.fineId)

            return (
              <article
                key={dispute.fineId}
                className="rounded-2xl border border-purple-400/20 bg-[#15181D] p-5 sm:p-6"
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-purple-200">
                      Disputed
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-[#F5F7FA]">
                      {dispute.playerName}
                    </h2>
                    <p className="mt-1 text-sm text-[#8B949E]">{dispute.fineReason}</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-2xl font-semibold text-[#F5F7FA]">
                      {formatFineAmount(team.currencyCode, dispute.currentAmountMinor)}
                    </p>
                    <p className="mt-1 text-xs font-medium text-purple-200">
                      {formatRemaining(dispute.remainingSeconds)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-[#252A31] bg-[#0B0D10] p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#8B949E]">
                    Player reason
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#F5F7FA]">{dispute.disputeReason}</p>
                </div>

                <div className="mt-5 flex flex-col gap-3 lg:grid lg:grid-cols-2">
                  <form action={accept} className="space-y-3 rounded-xl border border-[#22C55E]/20 p-4">
                    <label htmlFor={`accept-${dispute.fineId}`} className="text-sm font-medium text-[#F5F7FA]">
                      Acceptance reason
                    </label>
                    <textarea
                      id={`accept-${dispute.fineId}`}
                      name="reason"
                      rows={3}
                      minLength={3}
                      maxLength={1000}
                      required
                      className="w-full rounded-lg border border-[#252A31] bg-[#0B0D10] px-3 py-2 text-sm text-[#F5F7FA] outline-none focus:border-[#22C55E]"
                    />
                    <button
                      type="submit"
                      className="min-h-11 w-full rounded-lg bg-[#22C55E] px-4 font-semibold text-[#0B0D10] hover:opacity-90"
                    >
                      Accept dispute
                    </button>
                  </form>

                  <form action={reject} className="space-y-3 rounded-xl border border-amber-400/20 p-4">
                    <label htmlFor={`reject-${dispute.fineId}`} className="text-sm font-medium text-[#F5F7FA]">
                      Rejection reason
                    </label>
                    <textarea
                      id={`reject-${dispute.fineId}`}
                      name="reason"
                      rows={3}
                      minLength={3}
                      maxLength={1000}
                      required
                      className="w-full rounded-lg border border-[#252A31] bg-[#0B0D10] px-3 py-2 text-sm text-[#F5F7FA] outline-none focus:border-amber-400"
                    />
                    <button
                      type="submit"
                      className="min-h-11 w-full rounded-lg bg-amber-400/15 px-4 font-semibold text-amber-100 hover:bg-amber-400/20"
                    >
                      Reject dispute
                    </button>
                  </form>
                </div>

                <a
                  href={`/t/${teamId}/fines/${dispute.fineId}`}
                  className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#22C55E] hover:underline"
                >
                  View fine
                </a>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
