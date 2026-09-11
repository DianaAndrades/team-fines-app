'use client'

import { useActionState, useState } from 'react'

import {
  startNewSeasonAction,
  type StartNewSeasonActionState,
} from '@/features/seasons/actions'

type RolloverFormProps = {
  teamId: string
  currentSeasonName: string
}

type RolloverOptions = {
  copyPlayers: boolean
  copyCoaches: boolean
  copyRules: boolean
  carryUnpaidFines: boolean
}

const initialState: StartNewSeasonActionState = {
  ok: false,
  fieldErrors: {},
}

const defaultOptions: RolloverOptions = {
  copyPlayers: true,
  copyCoaches: true,
  copyRules: true,
  carryUnpaidFines: true,
}

export function RolloverForm({ teamId, currentSeasonName }: RolloverFormProps) {
  const [state, formAction, pending] = useActionState(startNewSeasonAction, initialState)
  const [name, setName] = useState('')
  const [options, setOptions] = useState<RolloverOptions>(defaultOptions)
  const [reviewing, setReviewing] = useState(false)

  function setOption(option: keyof RolloverOptions, checked: boolean) {
    setOptions((current) => ({ ...current, [option]: checked }))
  }

  return (
    <form action={formAction} className="space-y-5 rounded-2xl border border-[#252A31] bg-[#15181D] p-5 sm:p-6">
      <input type="hidden" name="teamId" value={teamId} />

      {!reviewing ? (
        <>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#22C55E]">
              Season rollover
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[#F5F7FA]">Start a new season</h2>
            <p className="mt-2 text-sm leading-6 text-[#8B949E]">
              Choose what should move forward from {currentSeasonName}. You will review everything before anything changes.
            </p>
          </div>

          <div>
            <label htmlFor="new-season-name" className="mb-2 block text-sm font-medium text-[#F5F7FA]">
              New season name
            </label>
            <input
              id="new-season-name"
              name="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="2027/28"
              maxLength={40}
              className="min-h-11 w-full rounded-lg border border-[#252A31] bg-[#0B0D10] px-3 text-[#F5F7FA] outline-none transition placeholder:text-[#8B949E] focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20"
            />
            {state?.fieldErrors.name?.[0] ? (
              <p className="mt-2 text-sm text-[#EF4444]">{state.fieldErrors.name[0]}</p>
            ) : null}
          </div>

          <fieldset className="space-y-3">
            <legend className="mb-3 text-sm font-medium text-[#F5F7FA]">Carry into the new season</legend>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#252A31] bg-[#0B0D10] p-4">
              <input
                type="checkbox"
                name="copyPlayers"
                checked={options.copyPlayers}
                onChange={(event) => setOption('copyPlayers', event.target.checked)}
                className="mt-0.5 size-4 accent-[#22C55E]"
              />
              <span>
                <span className="block text-sm font-semibold text-[#F5F7FA]">Copy players</span>
                <span className="mt-1 block text-xs leading-5 text-[#8B949E]">Keep the active player roster in the new season.</span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#252A31] bg-[#0B0D10] p-4">
              <input
                type="checkbox"
                name="copyCoaches"
                checked={options.copyCoaches}
                onChange={(event) => setOption('copyCoaches', event.target.checked)}
                className="mt-0.5 size-4 accent-[#22C55E]"
              />
              <span>
                <span className="block text-sm font-semibold text-[#F5F7FA]">Copy coaches</span>
                <span className="mt-1 block text-xs leading-5 text-[#8B949E]">Keep the owner and active coaches assigned to the season.</span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#252A31] bg-[#0B0D10] p-4">
              <input
                type="checkbox"
                name="copyRules"
                checked={options.copyRules}
                onChange={(event) => setOption('copyRules', event.target.checked)}
                className="mt-0.5 size-4 accent-[#22C55E]"
              />
              <span>
                <span className="block text-sm font-semibold text-[#F5F7FA]">Copy rules</span>
                <span className="mt-1 block text-xs leading-5 text-[#8B949E]">Clone the current rule catalog and its active states.</span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#252A31] bg-[#0B0D10] p-4">
              <input
                type="checkbox"
                name="carryUnpaidFines"
                checked={options.carryUnpaidFines}
                onChange={(event) => setOption('carryUnpaidFines', event.target.checked)}
                className="mt-0.5 size-4 accent-[#22C55E]"
              />
              <span>
                <span className="block text-sm font-semibold text-[#F5F7FA]">Carry unpaid fines</span>
                <span className="mt-1 block text-xs leading-5 text-[#8B949E]">Keep pending and disputed debt visible in the new season.</span>
              </span>
            </label>
          </fieldset>

          <button
            type="button"
            disabled={!name.trim()}
            onClick={() => setReviewing(true)}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#22C55E] px-5 py-2.5 font-semibold text-[#0B0D10] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Review rollover
          </button>
        </>
      ) : (
        <>
          <input type="hidden" name="name" value={name.trim()} />
          {options.copyPlayers ? <input type="hidden" name="copyPlayers" value="on" /> : null}
          {options.copyCoaches ? <input type="hidden" name="copyCoaches" value="on" /> : null}
          {options.copyRules ? <input type="hidden" name="copyRules" value="on" /> : null}
          {options.carryUnpaidFines ? <input type="hidden" name="carryUnpaidFines" value="on" /> : null}

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#22C55E]">Final check</p>
            <h2 className="mt-2 text-xl font-semibold text-[#F5F7FA]">Confirm new season</h2>
            <p className="mt-2 text-sm text-[#8B949E]">
              {currentSeasonName} → {name.trim()}
            </p>
          </div>

          <div data-testid="rollover-summary" className="rounded-xl border border-[#252A31] bg-[#0B0D10] p-4">
            <p className="text-sm font-semibold text-[#F5F7FA]">This rollover will include:</p>
            <ul className="mt-3 space-y-2 text-sm text-[#C7CDD4]">
              {options.copyPlayers ? <li>Players</li> : null}
              {options.copyCoaches ? <li>Coaches</li> : null}
              {options.copyRules ? <li>Rules</li> : null}
              {options.carryUnpaidFines ? <li>Unpaid fines</li> : null}
              {!Object.values(options).some(Boolean) ? <li>No roster, rules or debt will be copied.</li> : null}
            </ul>
          </div>

          {options.carryUnpaidFines ? (
            <p className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-3 text-sm leading-6 text-[#F8D48A]">
              Pending and disputed fines keep their existing amount, deadline or frozen dispute timer. They are linked to the new season, not duplicated.
            </p>
          ) : null}

          {state?.fieldErrors.name?.[0] ? (
            <p className="text-sm text-[#EF4444]">{state.fieldErrors.name[0]}</p>
          ) : null}
          {state?.fieldErrors.teamId?.[0] ? (
            <p className="text-sm text-[#EF4444]">{state.fieldErrors.teamId[0]}</p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => setReviewing(false)}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#252A31] bg-[#1B1F25] px-5 py-2.5 font-semibold text-[#F5F7FA] hover:bg-[#252A31] disabled:opacity-60"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#22C55E] px-5 py-2.5 font-semibold text-[#0B0D10] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? 'Starting season…' : 'Start new season'}
            </button>
          </div>
        </>
      )}
    </form>
  )
}
