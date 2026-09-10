'use client'

import { useFormStatus } from 'react-dom'

export function ConfirmFineButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="min-h-12 w-full rounded-xl bg-[#22C55E] px-5 font-semibold text-[#0B0D10] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
    >
      {pending ? 'Creating…' : 'Confirm fine'}
    </button>
  )
}
