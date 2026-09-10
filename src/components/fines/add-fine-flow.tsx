'use client'

import { useState } from 'react'

import { createRuleFineAction } from '@/features/fines/actions'
import { doubleMinorUnits, nextDoublingAt } from '@/features/fines/domain'
import { formatFineAmount } from './fine-card'

type PlayerOption = {
  teamMemberId: string
  name: string
}

type RuleOption = {
  id: string
  teamId: string
  seasonId: string
  title: string
  description: string | null
  defaultAmountMinor: string
  isActive: boolean
}

type AddFineFlowProps = {
  teamId: string
  currencyCode: string
  reviewStartedAt: string
  players: PlayerOption[]
  rules: RuleOption[]
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatReviewDeadline(value: Date) {
  const day = value.getUTCDate()
  const month = MONTHS[value.getUTCMonth()]
  const year = value.getUTCFullYear()
  const hour = value.getUTCHours().toString().padStart(2, '0')
  const minute = value.getUTCMinutes().toString().padStart(2, '0')
  return `${day} ${month} ${year}, ${hour}:${minute} UTC`
}

export function AddFineFlow({
  teamId,
  currencyCode,
  reviewStartedAt,
  players,
  rules,
}: AddFineFlowProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null)

  const selectedPlayer = players.find((player) => player.teamMemberId === selectedPlayerId)
  const selectedRule = rules.find((rule) => rule.id === selectedRuleId)

  if (!selectedPlayer) {
    return (
      <section className="space-y-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#22C55E]">Step 1 of 3</p>
          <h2 className="mt-2 text-2xl font-semibold text-[#F5F7FA]">Select player</h2>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {players.map((player) => (
            <button
              key={player.teamMemberId}
              type="button"
              onClick={() => setSelectedPlayerId(player.teamMemberId)}
              className="min-h-14 rounded-xl border border-[#252A31] bg-[#15181D] px-4 text-left font-medium text-[#F5F7FA] hover:border-[#22C55E]"
            >
              {player.name}
            </button>
          ))}
        </div>
      </section>
    )
  }

  if (!selectedRule) {
    return (
      <section className="space-y-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#22C55E]">Step 2 of 3</p>
          <h2 className="mt-2 text-2xl font-semibold text-[#F5F7FA]">Choose reason</h2>
          <p className="mt-2 text-sm text-[#8B949E]">Fine for {selectedPlayer.name}</p>
        </div>

        <div className="grid gap-2">
          {rules.filter((rule) => rule.isActive).map((rule) => (
            <button
              key={rule.id}
              type="button"
              onClick={() => setSelectedRuleId(rule.id)}
              className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-[#252A31] bg-[#15181D] px-4 text-left hover:border-[#22C55E]"
            >
              <span className="font-medium text-[#F5F7FA]">{rule.title}</span>
              <span className="shrink-0 text-sm font-semibold text-[#22C55E]">
                {formatFineAmount(currencyCode, rule.defaultAmountMinor)}
              </span>
            </button>
          ))}
        </div>
      </section>
    )
  }

  const deadline = nextDoublingAt(new Date(reviewStartedAt))
  const doubledAmount = doubleMinorUnits(selectedRule.defaultAmountMinor)
  const action = createRuleFineAction.bind(null, teamId)

  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#22C55E]">Step 3 of 3</p>
        <h2 className="mt-2 text-2xl font-semibold text-[#F5F7FA]">Review fine</h2>
      </div>

      <div className="rounded-2xl border border-[#252A31] bg-[#15181D] p-5">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-[0.14em] text-[#8B949E]">Player</dt>
            <dd className="mt-1 font-medium text-[#F5F7FA]">{selectedPlayer.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.14em] text-[#8B949E]">Reason</dt>
            <dd className="mt-1 font-medium text-[#F5F7FA]">{selectedRule.title}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.14em] text-[#8B949E]">Amount</dt>
            <dd className="mt-1 text-xl font-semibold text-[#F5F7FA]">
              {formatFineAmount(currencyCode, selectedRule.defaultAmountMinor)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.14em] text-[#8B949E]">First doubled amount</dt>
            <dd className="mt-1 text-xl font-semibold text-amber-200">
              {formatFineAmount(currencyCode, doubledAmount)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-[0.14em] text-[#8B949E]">First doubling</dt>
            <dd className="mt-1 font-medium text-[#F5F7FA]">{formatReviewDeadline(deadline)}</dd>
          </div>
        </dl>
      </div>

      <form action={action}>
        <input type="hidden" name="playerTeamMemberId" value={selectedPlayer.teamMemberId} />
        <input type="hidden" name="ruleId" value={selectedRule.id} />
        <button
          type="submit"
          className="min-h-12 w-full rounded-xl bg-[#22C55E] px-5 font-semibold text-[#0B0D10] hover:opacity-90"
        >
          Confirm fine
        </button>
      </form>
    </section>
  )
}
