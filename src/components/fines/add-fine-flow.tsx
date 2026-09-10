'use client'

import { useState } from 'react'

import {
  createCustomFineAction,
  createRuleFineAction,
} from '@/features/fines/actions'
import { doubleMinorUnits, nextDoublingAt } from '@/features/fines/domain'
import { ConfirmFineButton } from './confirm-fine-button'
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
const HUNDRED = BigInt(100)

function formatReviewDeadline(value: Date) {
  const day = value.getUTCDate()
  const month = MONTHS[value.getUTCMonth()]
  const year = value.getUTCFullYear()
  const hour = value.getUTCHours().toString().padStart(2, '0')
  const minute = value.getUTCMinutes().toString().padStart(2, '0')
  return `${day} ${month} ${year}, ${hour}:${minute} UTC`
}

function majorAmountToMinor(value: string): string | null {
  const match = value.trim().match(/^(\d+)(?:\.(\d{1,2}))?$/)
  if (!match) return null

  const fraction = (match[2] ?? '').padEnd(2, '0')
  const minor = BigInt(match[1]) * HUNDRED + BigInt(fraction || '0')
  return minor > BigInt(0) ? minor.toString() : null
}

function ReviewFine({
  teamId,
  currencyCode,
  reviewStartedAt,
  player,
  reason,
  amountMinor,
  ruleId,
}: {
  teamId: string
  currencyCode: string
  reviewStartedAt: string
  player: PlayerOption
  reason: string
  amountMinor: string
  ruleId?: string
}) {
  const deadline = nextDoublingAt(new Date(reviewStartedAt))
  const doubledAmount = doubleMinorUnits(amountMinor)
  const action = ruleId
    ? createRuleFineAction.bind(null, teamId)
    : createCustomFineAction.bind(null, teamId)

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
            <dd className="mt-1 font-medium text-[#F5F7FA]">{player.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.14em] text-[#8B949E]">Reason</dt>
            <dd className="mt-1 font-medium text-[#F5F7FA]">{reason}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.14em] text-[#8B949E]">Amount</dt>
            <dd className="mt-1 text-xl font-semibold text-[#F5F7FA]">
              {formatFineAmount(currencyCode, amountMinor)}
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
        <input type="hidden" name="playerTeamMemberId" value={player.teamMemberId} />
        {ruleId ? (
          <input type="hidden" name="ruleId" value={ruleId} />
        ) : (
          <>
            <input type="hidden" name="reason" value={reason} />
            <input type="hidden" name="amountMinor" value={amountMinor} />
          </>
        )}
        <ConfirmFineButton />
      </form>
    </section>
  )
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
  const [customMode, setCustomMode] = useState(false)
  const [customReason, setCustomReason] = useState('')
  const [customAmount, setCustomAmount] = useState('')
  const [customReview, setCustomReview] = useState(false)

  const selectedPlayer = players.find((player) => player.teamMemberId === selectedPlayerId)
  const selectedRule = rules.find((rule) => rule.id === selectedRuleId)
  const customAmountMinor = majorAmountToMinor(customAmount)
  const trimmedCustomReason = customReason.trim()

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

  if (selectedRule) {
    return (
      <ReviewFine
        teamId={teamId}
        currencyCode={currencyCode}
        reviewStartedAt={reviewStartedAt}
        player={selectedPlayer}
        reason={selectedRule.title}
        amountMinor={selectedRule.defaultAmountMinor}
        ruleId={selectedRule.id}
      />
    )
  }

  if (customReview && customAmountMinor && trimmedCustomReason) {
    return (
      <ReviewFine
        teamId={teamId}
        currencyCode={currencyCode}
        reviewStartedAt={reviewStartedAt}
        player={selectedPlayer}
        reason={trimmedCustomReason}
        amountMinor={customAmountMinor}
      />
    )
  }

  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#22C55E]">Step 2 of 3</p>
        <h2 className="mt-2 text-2xl font-semibold text-[#F5F7FA]">Choose reason</h2>
        <p className="mt-2 text-sm text-[#8B949E]">Fine for {selectedPlayer.name}</p>
      </div>

      {customMode ? (
        <div className="space-y-4 rounded-2xl border border-[#252A31] bg-[#15181D] p-5">
          <div>
            <label htmlFor="custom-reason" className="text-sm font-medium text-[#F5F7FA]">
              Custom reason
            </label>
            <textarea
              id="custom-reason"
              value={customReason}
              onChange={(event) => setCustomReason(event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-xl border border-[#252A31] bg-[#0B0D10] px-3 py-2 text-[#F5F7FA] outline-none focus:border-[#22C55E]"
            />
          </div>
          <div>
            <label htmlFor="custom-amount" className="text-sm font-medium text-[#F5F7FA]">
              Amount
            </label>
            <input
              id="custom-amount"
              inputMode="decimal"
              value={customAmount}
              onChange={(event) => setCustomAmount(event.target.value)}
              placeholder="12.50"
              className="mt-2 min-h-11 w-full rounded-xl border border-[#252A31] bg-[#0B0D10] px-3 text-[#F5F7FA] outline-none focus:border-[#22C55E]"
            />
          </div>
          <button
            type="button"
            disabled={!customAmountMinor || !trimmedCustomReason}
            onClick={() => setCustomReview(true)}
            className="min-h-11 w-full rounded-xl bg-[#22C55E] px-4 font-semibold text-[#0B0D10] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue to review
          </button>
        </div>
      ) : (
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
          <button
            type="button"
            onClick={() => setCustomMode(true)}
            className="min-h-14 rounded-xl border border-dashed border-[#22C55E]/60 bg-[#22C55E]/5 px-4 text-left font-medium text-[#22C55E] hover:bg-[#22C55E]/10"
          >
            Custom fine
          </button>
        </div>
      )}
    </section>
  )
}
