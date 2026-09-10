'use client'

import { useActionState } from 'react'

import {
  createTeamAction,
  type CreateTeamActionState,
} from '@/features/teams/actions'

const initialState: CreateTeamActionState = {
  ok: false,
  fieldErrors: {},
}

export default function NewTeamPage() {
  const [state, formAction, pending] = useActionState(createTeamAction, initialState)

  return (
    <main className="min-h-screen bg-[#0B0D10] px-6 py-12 text-[#F5F7FA]">
      <section className="mx-auto w-full max-w-xl">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.24em] text-[#22C55E]">
          Team Fines
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">Create your team</h1>
        <p className="mt-4 text-base leading-7 text-[#8B949E]">
          Start with the basics. You can invite coaches and players afterwards.
        </p>

        <form action={formAction} className="mt-10 space-y-6">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium">
              Team name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="organization"
              className="min-h-11 w-full rounded-lg border border-[#252A31] bg-[#15181D] px-3 text-[#F5F7FA] outline-none transition focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20"
            />
            {state.fieldErrors.name?.[0] ? (
              <p className="mt-2 text-sm text-[#EF4444]">{state.fieldErrors.name[0]}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="currencyCode" className="mb-2 block text-sm font-medium">
              Currency
            </label>
            <select
              id="currencyCode"
              name="currencyCode"
              defaultValue="EUR"
              className="min-h-11 w-full rounded-lg border border-[#252A31] bg-[#15181D] px-3 text-[#F5F7FA] outline-none transition focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20"
            >
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="USD">USD</option>
            </select>
            {state.fieldErrors.currencyCode?.[0] ? (
              <p className="mt-2 text-sm text-[#EF4444]">
                {state.fieldErrors.currencyCode[0]}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="seasonName" className="mb-2 block text-sm font-medium">
              Current season
            </label>
            <input
              id="seasonName"
              name="seasonName"
              type="text"
              placeholder="2026/27"
              className="min-h-11 w-full rounded-lg border border-[#252A31] bg-[#15181D] px-3 text-[#F5F7FA] outline-none transition placeholder:text-[#8B949E] focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20"
            />
            {state.fieldErrors.seasonName?.[0] ? (
              <p className="mt-2 text-sm text-[#EF4444]">
                {state.fieldErrors.seasonName[0]}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#22C55E] px-5 py-2.5 font-semibold text-[#0B0D10] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Creating team…' : 'Create team'}
          </button>
        </form>
      </section>
    </main>
  )
}
