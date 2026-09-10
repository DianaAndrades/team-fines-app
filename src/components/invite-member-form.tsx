'use client'

import { useActionState } from 'react'

import {
  inviteMemberAction,
  type InviteMemberActionState,
} from '@/features/invitations/actions'
import type { InvitationRole } from '@/features/invitations/service'

type InviteMemberFormProps = {
  teamId: string
  role: InvitationRole
}

const initialState: InviteMemberActionState = {
  ok: false,
  fieldErrors: {},
}

export function InviteMemberForm({ teamId, role }: InviteMemberFormProps) {
  const action = inviteMemberAction.bind(null, teamId, role)
  const [state, formAction, pending] = useActionState(action, initialState)
  const roleLabel = role === 'PLAYER' ? 'player' : 'coach'

  return (
    <section className="rounded-2xl border border-[#252A31] bg-[#15181D] p-5">
      <h2 className="text-lg font-semibold text-[#F5F7FA]">Invite {roleLabel}</h2>
      <p className="mt-1 text-sm leading-6 text-[#8B949E]">
        They will see the invitation after signing in with this email address.
      </p>

      <form action={formAction} className="mt-5 space-y-3">
        <div>
          <label
            htmlFor={`invite-${role.toLowerCase()}-email`}
            className="mb-2 block text-sm font-medium text-[#F5F7FA]"
          >
            {role === 'PLAYER' ? 'Player email' : 'Coach email'}
          </label>
          <input
            id={`invite-${role.toLowerCase()}-email`}
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            aria-invalid={Boolean(state.fieldErrors.email?.length)}
            className="min-h-11 w-full rounded-lg border border-[#252A31] bg-[#0B0D10] px-3 text-[#F5F7FA] outline-none transition placeholder:text-[#8B949E] focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20"
          />
          {state.fieldErrors.email?.[0] ? (
            <p className="mt-2 text-sm text-[#EF4444]">{state.fieldErrors.email[0]}</p>
          ) : null}
        </div>

        {state.formError ? (
          <p role="alert" className="text-sm text-[#EF4444]">
            {state.formError}
          </p>
        ) : null}

        {state.ok ? (
          <p role="status" className="text-sm text-[#22C55E]">
            Invitation created.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#22C55E] px-4 py-2.5 font-semibold text-[#0B0D10] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Inviting…' : `Invite ${roleLabel}`}
        </button>
      </form>
    </section>
  )
}
