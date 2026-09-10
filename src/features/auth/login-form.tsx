'use client'

import { FormEvent, useState, useTransition } from 'react'
import { Mail, LoaderCircle } from 'lucide-react'
import { requestMagicLink } from './actions'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)

    startTransition(async () => {
      const result = await requestMagicLink({ email })
      if (!result.ok) {
        setError(result.error)
        return
      }

      setMessage('Check your email. Your sign-in link is on the way.')
    })
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            aria-describedby={error ? 'login-error' : message ? 'login-message' : undefined}
            aria-invalid={Boolean(error)}
            disabled={isPending}
            className="h-12 w-full rounded-xl border border-input bg-secondary/70 pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
          />
        </div>
      </div>

      {error ? (
        <p id="login-error" role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}

      {message ? (
        <p id="login-message" role="status" className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-green-300">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
        {isPending ? 'Sending…' : 'Send magic link'}
      </button>
    </form>
  )
}
